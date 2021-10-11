import path, { resolve, dirname, relative, sep, posix, isAbsolute, normalize, basename } from 'path';
import { promises as fs, createReadStream } from 'fs';
import * as kl from 'kolorist';
import { createPluginContainer } from './lib/rollup-plugin-container.js';
import { transformImports } from './lib/transform-imports.js';
import { getMimeType } from './lib/mimetypes.js';
import { debug, formatPath } from './lib/output-utils.js';
import { getPlugins } from './lib/plugins.js';
import { watch } from './lib/fs-watcher.js';
import { matchAlias, resolveAlias } from './lib/aliasing.js';
import { addTimestamp, PREFIX_REG, serializePrefix } from './lib/net-utils.js';
import { mergeSourceMaps } from './lib/sourcemap.js';
import { isFile } from './lib/fs-utils.js';
import { STYLE_REG } from './plugins/wmr/styles/styles-plugin.js';
import { getPackageInfo } from './plugins/npm-plugin/utils.js';

const NOOP = () => {};

const log = debug('wmr:middleware');
const logWatcher = debug('wmr:watcher');
const logCache = debug('wmr:cache');

/**
 * In-memory cache of files that have been generated and written to .cache/
 * @type {Map<string, string | Buffer | Uint8Array>}
 */
const WRITE_CACHE = new Map();

/** @type {Map<string, {dependencies: Set<string>, dependents: Set<string>, acceptingUpdates: boolean, stale?: boolean}>} */
export const moduleGraph = new Map();

/**
 * @param {import('wmr').BuildOptions & { distDir: string }} options
 * @returns {import('polka').Middleware}
 */
export default function wmrMiddleware(options) {
	let { cwd, root, out, distDir = 'dist', onError, onChange = NOOP, alias, sourcemap } = options;

	distDir = resolve(dirname(out), distDir);

	const NonRollup = createPluginContainer(getPlugins(options), {
		cwd: root,
		sourcemap,
		writeFile: (filename, source) => {
			filename = path.normalize(filename);
			// Remove .cache folder from filename if present. The cache
			// works with relative keys only.
			if (isAbsolute(filename)) {
				const relativeFile = relative(out, filename);
				if (!relativeFile.startsWith('..')) {
					filename = relativeFile;
				}
			}

			// FIXME: Normalization
			WRITE_CACHE.set(filename, source);
			// writeCacheFile(filename, source);
		},
		output: {
			// assetFileNames: '@asset/[name][extname]',
			// chunkFileNames: '[name][extname]',
			// Use a hash to prevent collisions between assets with the
			// same basename.
			assetFileNames: '[name][extname]',
			dir: out,
			format: 'esm'
		}
	});

	NonRollup.buildStart();
	NonRollup.outputOptions();

	// Make watcher aware of aliased directories
	const pathAliases = Object.keys(alias)
		.filter(key => key.endsWith('/*'))
		.map(key => alias[key]);
	const watchDirs = [root, resolve(cwd, 'package.json'), ...pathAliases];
	logWatcher(`watching:\n${watchDirs.map(d => kl.dim('- ' + d)).join('\n')}`);

	const watcher = watch(watchDirs, {
		cwd,
		disableGlobbing: true,
		ignoreInitial: true,
		ignored: [/(^|[/\\])(node_modules|\.git|\.DS_Store|\.cache)([/\\]|$)/, resolve(cwd, out), resolve(cwd, distDir)]
	});
	const pendingChanges = new Set();

	let timeout = null;
	function flushChanges() {
		timeout = null;
		onChange({ changes: Array.from(pendingChanges), duration: 0 });
		pendingChanges.clear();
	}

	function bubbleUpdates(filename, visited = new Set()) {
		if (visited.has(filename)) return true;
		visited.add(filename);
		// Delete file from the in-memory cache:
		WRITE_CACHE.delete(filename);

		const mod = moduleGraph.get(filename);
		if (!mod) return false;

		if (mod.hasErrored) {
			mod.hasErrored = false;
			return false;
		}

		if (mod.acceptingUpdates) {
			mod.stale = true;
			pendingChanges.add(filename);
			return true;
		} else if (mod.dependents.size) {
			let accepts = true;
			[...mod.dependents].forEach(value => {
				if (!bubbleUpdates(value, visited)) accepts = false;
			});

			if (accepts) mod.stale = true;

			return accepts;
		}

		// We need a full-reload signal
		return false;
	}

	/**
	 * @param {string} absoluteId
	 * @param {'create' | 'update' | 'delete'} changeType
	 */
	function applyWatchChanges(absoluteId, changeType) {
		const event = { event: changeType };

		const seen = new Set();
		const items = [absoluteId];
		/** @type {string | undefined} */
		let item;
		while ((item = items.pop()) !== undefined) {
			if (seen.has(item)) continue;
			const res = NonRollup.watchChange(item, event);
			if (Array.isArray(res)) items.push(...res);
			seen.add(item);
		}

		const changed = Array.from(seen);
		for (let file of changed) {
			const originalFile = file;
			file = normalize(file);

			// Resolve potentially aliased paths and normalize to 'nix:
			const aliased = matchAlias(alias, file.split(sep).join(posix.sep));
			if (aliased) {
				// Trim leading slash, we need a relative path for the cache
				file = aliased.slice(1);
			} else {
				if (isAbsolute(file)) {
					const relativeFile = relative(root, file);
					if (!relativeFile.startsWith('..')) {
						file = relativeFile;
					}
				}

				file = file.split(sep).join(posix.sep);
			}

			logWatcher(`${kl.cyan(originalFile)} -> ${kl.dim(file)} [${changeType}]`);

			logCache(`delete: ${kl.cyan(file)}`);
			WRITE_CACHE.delete(file);

			// Delete source file if there is any
			if (options.sourcemap) {
				const sourceKey = file + '.map';

				if (WRITE_CACHE.has(sourceKey)) {
					logCache(`delete: ${kl.cyan(sourceKey)}`);
					WRITE_CACHE.delete(sourceKey);
				}
			}

			// We could be dealing with an asset
			if (WRITE_CACHE.has(file + '?asset')) {
				const cacheKey = file + '?asset';
				logCache(`delete: ${kl.cyan(cacheKey)}`);
				WRITE_CACHE.delete(cacheKey);
			}

			// ...or a proxy module
			if (WRITE_CACHE.has(file + '?module')) {
				const cacheKey = file + '?module';
				logCache(`delete: ${kl.cyan(cacheKey)}`);
				WRITE_CACHE.delete(cacheKey);
			}

			if (!pendingChanges.size) timeout = setTimeout(flushChanges, 60);

			if (moduleGraph.has(file + '?module')) {
				pendingChanges.add('/' + file + '?module');

				// Update files relying on the proxy module so that they
				// re-evaluate CSS module class names.
				bubbleUpdates(file + '?module');
			}

			if (STYLE_REG.test(file)) {
				pendingChanges.add('/' + file);
			} else if (/\.(mjs|[tj]sx?)$/.test(file)) {
				if (!moduleGraph.has(file)) {
					onChange({ reload: true });
					clearTimeout(timeout);
					return;
				}

				if (!bubbleUpdates(file)) {
					pendingChanges.clear();
					clearTimeout(timeout);
					onChange({ reload: true });
				}
			} else {
				pendingChanges.clear();
				clearTimeout(timeout);
				onChange({ reload: true });
			}
		}
	}

	watcher.on('add', filename => {
		const absolute = resolve(cwd, filename);
		applyWatchChanges(absolute, 'create');
	});

	watcher.on('unlink', filename => {
		const absolute = resolve(cwd, filename);
		applyWatchChanges(absolute, 'delete');
	});

	watcher.on('change', filename => {
		const absolute = resolve(cwd, filename);
		applyWatchChanges(absolute, 'update');
	});

	const resolveExts = new Set(options.resolve.extensions);

	return async (req, res, next) => {
		const { searchParams, pathname } = new URL(req.url, 'file://');
		let id = pathname.slice(1);

		// TODO: Ignore dot files

		// Force serving as a js module for proxy modules. Main use
		// case is CSS-Modules.
		let isModule = searchParams.has('module') || resolveExts.has(path.posix.extname(id));

		// Restore prefix from url
		let prefix = '';
		const match = id.match(/^(@[\w_-]+)\/(.*)/);
		if (match) {
			prefix = '\0' + match[1].slice(1) + ':';
			id = match[2];
			// The `id:` prefix is special as it's only purpose is to guarantee
			// proper serialization
			if (prefix === '\0id:') {
				prefix = '';
			} else {
				id = prefix + id;
			}
		} else {
			id = './' + id;
		}

		try {
			let startTime = Date.now();
			const resolvedObj = await NonRollup.resolveId(id, null, { custom: { isModule } });
			const resolvedId = resolvedObj.id;
			const resolveTime = Date.now() - startTime;

			// Fall back to index html if nobody resolved the url
			if (pathname === '/' || (!prefix && path.posix.extname(pathname) === '')) {
				// TODO: Support 200.html
				next();
				return;
			}

			const ext = path.extname(resolvedId);

			let needsModuleFlag = false;

			// TODO: Should this be configurable?
			check: if (!isModule) {
				isModule = resolveExts.has(ext) || ext === '';
				if (/^\0npm:/.test(id)) {
					const info = getPackageInfo(id.slice('\0npm:'.length));
					if (!info.pathname) {
						isModule = true;
						break check;
					}

					const deepExt = path.extname(info.pathname);
					if (!deepExt) {
						needsModuleFlag = true;
						isModule = true;
					} else if (resolveExts.has(deepExt)) {
						isModule = true;
					}
				}
			}

			log(`${kl.cyan(formatPath(id))} -> ${kl.dim(resolvedId)}`);

			startTime = Date.now();
			let result = await NonRollup.load(resolvedId);
			const loadTime = Date.now() - startTime;
			startTime = Date.now();
			result = await NonRollup.transform(result.code, resolvedId);

			// All plugins have processed the result and now we're
			// essentially serializing paths for the browser if
			// necessary.
			result = await transformImports(result.code, resolvedId, {
				async resolveImportMeta(property) {
					return NonRollup.resolveImportMeta(property);
				},
				async resolveId(spec) {
					const resolved = await NonRollup.resolveId(spec, resolvedId);
					spec = resolved.id;

					const match = /(.*)(?:\?(.*))?/.exec(spec);
					if (!match) return;

					let [, s, query] = match;

					const ext = path.posix.extname(s);
					const param = ext && !resolveExts.has(ext) ? (query ? query + '&module' : '?module') : '';

					// Return prefix if they have any
					//   \0foo-bar:asdf -> /foo-bar:asdf
					const prefixed = serializePrefix(s);
					if (prefixed) return prefixed + param;

					// Detect absolute urls
					if (!/^(?:[./]|data:|https?:\/\/)/.test(s)) {
						return s;
					}
					// Detect urls that look like a prefix
					else if (/^@/.test(s)) {
						return '/@id/' + s;
					} else if (/^\//.test(s)) {
						// ^TODO: Check windows
						// TODO: Resolve alias
						const rootRelative = path.relative(root, s);
						// Check if path is inside root
						if (!rootRelative.startsWith('..')) {
							const rel = path.relative(path.dirname(path.join(root, id)), s);
							return './' + rel + param;
						}
						return '/@id' + s + param;
					}

					return s + param;
				}
			});
			const transformTime = Date.now() - startTime;

			// Detect `Content-Type`
			const type = isModule ? 'application/javascript;charset=utf-8' : getMimeType(resolvedId) || 'text/plain';

			log(`<-- ${kl.cyan(formatPath(id))} as ${kl.dim(type)}`);

			// Check if we're dealing with a proxy module
			const cleanId = path.posix.normalize(id);
			let cacheKey = cleanId;

			if (!needsModuleFlag) {
				needsModuleFlag = ext !== '' && !resolveExts.has(ext);
			}
			if (needsModuleFlag) cacheKey += '?module';

			WRITE_CACHE.set(cacheKey, result.code);

			const out = WRITE_CACHE.get(isModule ? cacheKey : cleanId);

			res.writeHead(200, {
				'Content-Type': type,
				'Content-Length': Buffer.byteLength(out, 'utf-8'),
				'Server-Timing': `resolve;dur=${resolveTime}, load;dur=${loadTime}, transform;dur=${transformTime}`
			});
			res.end(out);
		} catch (e) {
			// `throw null` also skips handling
			if (e == null) return next();

			if (e.code === 'ENOENT') {
				// e.message = `not found (.${sep}${relative(root, e.path)})`;
				e.message = `File not found`;
				e.code = 404;
			}

			onError(e);
			next(e);
		}
	};
}

/**
 *
 * @param {string} file Path to file to load
 * @param {string} cwd
 * @param {Record<string, string>} alias
 * @returns
 */
function resolveFile(file, cwd, alias) {
	// Probably an error if we ar enot called with an absolute path
	if (!isAbsolute(file)) {
		throw new Error(`Expected absolute path but got: ${file}`);
	}

	// Safety measures should always be as close as possible to the thing that
	// they're trying to protect. Otherwise those meausures will be accidentally
	// removed during a future refactoring.

	// Normalize the result, collapses `/../` and stuff
	file = normalize(file);

	// No dotfiles, which usually contain sensitive stuff
	if (basename(file).startsWith('.')) {
		throw new Error(`Loading files starting with a dot is not allowed: ${file}`);
	}

	// Check if the file resolved to something we are actually allowed to load.
	meup: if (relative(cwd, file).startsWith('..')) {
		// TODO: Better to precompute this in normalizeOptions?
		const includeDirs = [cwd];
		// File is not in cwd, but might still be in an aliased directory
		for (const name in alias) {
			const value = alias[name];

			if (isAbsolute(value)) {
				includeDirs.push(value);

				if (!relative(value, file).startsWith('..')) {
					break meup;
				}
			}
		}

		const allowed = includeDirs.map(d => `- ${d}`).join('\n');
		throw new Error(
			`Not allowed to load file: ${file}.\nAdd an alias to a directory if you want to include load files outside of the web root. The current configured directories to load files from are:\n${allowed}`
		);
	}

	return file;
}

/**
 * Write data to an in-memory cache
 * @param {string} fileName
 * @param {string|Buffer|Uint8Array} data
 */
async function writeCacheFile(fileName, data) {
	if (fileName.includes('\0')) return;

	fileName = normalize(fileName);
	WRITE_CACHE.set(fileName, data);
	logCache(`write ${kl.cyan(fileName)}`);
}
