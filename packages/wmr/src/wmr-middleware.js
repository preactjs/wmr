import { resolve, dirname, relative, sep, posix, isAbsolute, normalize, basename } from 'path';
import { promises as fs, createReadStream } from 'fs';
import * as kl from 'kolorist';
import { getWmrClient } from './plugins/wmr/plugin.js';
import { createPluginContainer } from './lib/rollup-plugin-container.js';
import { transformImports } from './lib/transform-imports.js';
import { getMimeType } from './lib/mimetypes.js';
import { debug, formatPath } from './lib/output-utils.js';
import { getPlugins } from './lib/plugins.js';
import { watch } from './lib/fs-watcher.js';
import { matchAlias, resolveAlias } from './lib/aliasing.js';
import { addTimestamp } from './lib/net-utils.js';
import { mergeSourceMaps } from './lib/sourcemap.js';
import { isFile } from './lib/fs-utils.js';
import { STYLE_REG } from './plugins/wmr/styles/styles-plugin.js';

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
			// Remove .cache folder from filename if present. The cache
			// works with relative keys only.
			if (isAbsolute(filename)) {
				const relativeFile = relative(out, filename);
				if (!relativeFile.startsWith('..')) {
					filename = relativeFile;
				}
			}
			writeCacheFile(filename, source);
		},
		output: {
			// assetFileNames: '@asset/[name][extname]',
			// chunkFileNames: '[name][extname]',
			// Use a hash to prevent collisions between assets with the
			// same basename.
			assetFileNames: '[name][extname]?asset',
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

	return async (req, res, next) => {
		// @ts-ignore
		let path = posix.normalize(req.path);

		const queryParams = new URL(req.url, 'file://').searchParams;

		let prefix = '';

		// Workaround for transform forcing extensionless ids to be
		// non-js
		let isVirtual = false;

		let file = '';
		let id = path;

		// Cache key for write cache. Preserves `@id` and `@alias` prefixes
		let cacheKey = id.slice(1); // Strip "/" at the beginning

		// Path for virtual modules that refer to an unprefixed id.
		if (path.startsWith('/@id/')) {
			// Virtual paths have no exact file match, so we don't set `file`
			isVirtual = true;
			id = path.slice('/@id/'.length);

			// Add back leading slash if it was part of the virtual id.
			// Example: `/@windicss/windi.css`
			if (req.path.startsWith('/@id//')) {
				id = '/' + id;
			}
		} else if (path.startsWith('/@npm/')) {
			// Virtual paths have no exact file match, so we don't set `file`
			id = path.slice('/@npm/'.length);
			isVirtual = true;
		} else if (path.startsWith('/@alias/')) {
			id = posix.normalize(path.slice('/@alias/'.length));

			// Resolve to a file here for non-js Transforms
			file = resolveAlias(options.alias, id);
		} else {
			const prefixMatches = path.match(/^\/?@([a-z-]+)(\/.+)$/);
			if (prefixMatches) {
				prefix = '\0' + prefixMatches[1] + ':';
				path = prefixMatches[2];
			}

			if (path.startsWith('/@id/')) {
				// Virtual paths have no exact file match, so we don't set `file`
				isVirtual = true;
				path = path.slice('/@id'.length);
			}

			// convert to OS path:
			const osPath = path.slice(1).split(posix.sep).join(sep);

			file = resolve(root, osPath);

			// Rollup-style CWD-relative Unix-normalized path "id":
			id = relative(root, file).replace(/^\.\//, '').replace(/^[\0]/, '').split(sep).join(posix.sep);

			// TODO: Vefify prefix mappings in write cache
			cacheKey = prefix + id;
			// Normalize the cacheKey so it matches what will be in the WRITE_CACHE, where we store in native paths
			cacheKey = cacheKey.split(posix.sep).join(sep);

			if (!isVirtual) {
				id = `./${id}`;
			}

			// add back any prefix if there was one:
			file = prefix + file;
			id = prefix + id;
		}

		// Force serving as a js module for proxy modules. Main use
		// case is CSS-Modules.
		const isModule = queryParams.has('module');
		const isAsset = queryParams.has('asset');

		let type;
		if (isModule) type = 'application/javascript;charset=utf-8';
		else if (isAsset && /\.(?:s[ac]ss|less)$/.test(file)) type = 'text/css';
		else type = getMimeType(file);

		if (type) {
			res.setHeader('Content-Type', type);
		}

		log(`${kl.cyan(formatPath(path))} -> ${kl.dim(id)} file: ${kl.dim(file)}`);

		try {
			/** @type {(ctx: Context) => Result | Promise<Result>} */
			let transform;
			if (path === '/_wmr.js') {
				transform = getWmrClient.bind(null);
			} else if (/\.map$/.test(path)) {
				transform = TRANSFORMS.asset;
			} else if (queryParams.has('asset')) {
				cacheKey += '?asset';
				transform = TRANSFORMS.asset;
			} else if (prefix || isVirtual || isModule || /\.([mc]js|[tj]sx?)$/.test(file) || STYLE_REG.test(file)) {
				transform = TRANSFORMS.js;
			} else if (file.startsWith(root + sep) && (await isFile(file))) {
				// Ignore dotfiles
				if (posix.basename(file).startsWith('.')) {
					throw {
						message: `File not found`,
						code: 404
					};
				}
				transform = TRANSFORMS.asset;
			} else {
				transform = TRANSFORMS.generic;
			}

			const start = Date.now();
			let result = await transform({
				req,
				res,
				id,
				file,
				path,
				prefix,
				root,
				out,
				NonRollup,
				alias: options.alias,
				cacheKey
			});

			// return false to skip handling:
			if (result === false) return next();

			// return a value to use it as the response:
			if (result != null) {
				// Grab the asset id out of the compiled js
				// TODO: Wire this up into Style-Plugin by passing the
				// import type through resolution somehow
				if (!isModule && STYLE_REG.test(file) && typeof result === 'string') {
					const match = result.match(/style\(["']\/([^"']+?)["'].*?\);/m);

					if (match) {
						if (WRITE_CACHE.has(match[1])) {
							result = /** @type {string} */ WRITE_CACHE.get(match[1]);
							res.setHeader('Content-Type', 'text/css;charset=utf-8');
						}
					}
				}

				log(`<-- ${kl.cyan(formatPath(id))} as ${kl.dim('' + res.getHeader('Content-Type'))}`);
				const time = Date.now() - start;
				res.writeHead(200, {
					'Content-Length': Buffer.byteLength(result, 'utf-8'),
					'Server-Timing': `${transform.name};dur=${time}`
				});
				res.end(result);
			}
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
 * @typedef Context
 * @property {ReturnType<typeof createPluginContainer>} NonRollup
 * @property {string} id rollup-style cwd-relative file identifier
 * @property {string} file absolute file path
 * @property {string} path request path
 * @property {string} prefix a Rollup plugin -style path `\0prefix:`, if the URL was `/＠prefix/*`
 * @property {string} root public directory, including ./public if detected
 * @property {string} out output directory
 * @property {Record<string, string>} alias
 * @property {string} cacheKey Key for write cache
 * @property {InstanceType<import('http')['IncomingMessage']>} req HTTP Request object
 * @property {InstanceType<import('http')['ServerResponse']>} res HTTP Response object
 */

const logJsTransform = debug('wmr:transform.js');
const logAssetTransform = debug('wmr:transform.asset');

/** @typedef {string|false|Buffer|Uint8Array|null|void} Result */

/** @type {{ [key: string]: (ctx: Context) => Result|Promise<Result> }} */
export const TRANSFORMS = {
	// Handle direct asset requests (/foo?asset)
	async asset({ file, root, req, res, id, cacheKey }) {
		if (WRITE_CACHE.has(cacheKey)) {
			logAssetTransform(`<-- ${kl.cyan(formatPath(id))} [cached]`);
			return WRITE_CACHE.get(cacheKey);
		}

		const filename = resolve(root, file);
		const stats = await fs.stat(filename);

		if (stats.isDirectory()) {
			res.writeHead(403);
			res.end();
		}
		const ims = req.headers['if-modified-since'];
		if (ims && stats.mtime > new Date(ims)) {
			res.writeHead(304);
			res.end();
			return;
		}
		res.writeHead(200, {
			'Content-Length': stats.size,
			'Last-Modified': stats.mtime.toUTCString()
		});
		createReadStream(filename).pipe(res, { end: true });
	},

	// Handle individual JavaScript modules
	async js({ id, file, prefix, res, root, out, NonRollup, req, alias, cacheKey }) {
		let code;
		try {
			res.setHeader('Content-Type', 'application/javascript;charset=utf-8');

			if (WRITE_CACHE.has(id)) {
				logJsTransform(`<-- ${kl.cyan(formatPath(id))} [cached]`);
				return WRITE_CACHE.get(id);
			}

			const resolved = await NonRollup.resolveId(id);
			const resolvedId = typeof resolved == 'object' ? resolved && resolved.id : resolved;
			let result = resolvedId && (await NonRollup.load(resolvedId));

			code = typeof result == 'object' ? result && result.code : result;

			if (code == null || code === false) {
				// Always use the resolved id as the basis for our file
				let file = resolvedId;
				if (prefix) file = file.replace(prefix, '');
				file = file.split(posix.sep).join(sep);
				if (!isAbsolute(file)) file = resolve(root, file);
				code = await fs.readFile(resolveFile(file, root, alias), 'utf-8');

				// TODO: Optional: Load sourcemap
			}

			const transformed = await NonRollup.transform(code, id);
			code = transformed.code;
			/** @type {import('rollup').ExistingRawSourceMap | null} */
			let sourceMap = transformed.map;

			const rewritten = await transformImports(code, id, {
				resolveImportMeta(property) {
					return NonRollup.resolveImportMeta(property);
				},
				async resolveId(spec, importer) {
					if (spec === 'wmr') return '/_wmr.js';
					if (/^(data:|https?:|\/\/)/.test(spec)) {
						logJsTransform(`${kl.cyan(formatPath(spec))} [external]`);
						return spec;
					}
					let graphId = importer.replace(/^\.?\.?\//, '');
					if (!moduleGraph.has(graphId)) {
						moduleGraph.set(graphId, { dependencies: new Set(), dependents: new Set(), acceptingUpdates: false });
					}
					const mod = moduleGraph.get(graphId);
					if (mod.hasErrored) mod.hasErrored = false;

					// const resolved = await NonRollup.resolveId(spec, importer);
					let originalSpec = spec;
					const resolved = await NonRollup.resolveId(spec, file);
					if (resolved) {
						spec = typeof resolved == 'object' ? resolved.id : resolved;
						// Some rollup plugins use absolute paths as virtual identifiers :/
						// Example: `/@windicss/windi.css`
						if (/^\/@/.test(spec)) {
							spec = `/@id/${spec}`;
						} else if (/^(\/|\\|[a-z]:\\)/i.test(spec)) {
							spec = relative(dirname(file), spec).split(sep).join(posix.sep);
							if (!/^\.?\.?\//.test(spec)) {
								spec = './' + spec;
							}
						}
						if (typeof resolved == 'object' && resolved.external) {
							if (/^(data|https?):/.test(spec)) {
								logJsTransform(`${kl.cyan(formatPath(spec))} [external]`);
								return spec;
							}

							spec = relative(root, spec).split(sep).join(posix.sep);
							if (!/^(\/|[\w-]+:)/.test(spec)) spec = `/${spec}`;
							return spec;
						}
					}

					let hasPrefix = false;
					// \0abc:foo --> /@abcF/foo
					spec = spec.replace(/^\0?([a-z-]+):(.+)$/, (s, prefix, spec) => {
						hasPrefix = true;

						// \0abc:/abs/disk/path --> /@abc/cwd-relative-path
						if (spec[0] === '/' || spec[0] === sep) {
							spec = relative(root, spec).split(sep).join(posix.sep);
						}
						// Retain bare specifiers when serializing to url
						else if (!/^\.?\.\//.test(spec) && prefix !== 'npm') {
							spec = `@id/${spec}`;
						}

						return '/@' + prefix + '/' + spec;
					});

					// foo.css --> foo.css?module (import of CSS Modules proxy module)
					const ext = posix.extname(spec);
					if (!hasPrefix && ext !== '' && !/[tj]sx?$/.test(ext)) spec += '?module';

					// If file resolves outside of root it may be an aliased path.
					if (spec.startsWith('.')) {
						const aliased = matchAlias(alias, posix.resolve(posix.dirname(file), spec));
						if (aliased) spec = aliased;
					}

					if (!spec.startsWith('/@id/') && !spec.startsWith('/@alias/') && !/^\0?\.?\.?[/\\]/.test(spec)) {
						// Check if the spec is an alias
						const aliased = matchAlias(alias, spec);
						if (aliased) spec = aliased;

						if (!spec.startsWith('/@alias/')) {
							spec = `/@id/${spec}`;
						}
					}

					// Ensure files are POSIX-style relative for watcher to pick up.
					const modSpec =
						/^\.\//.test(spec) && importer ? posix.join(posix.dirname(importer), spec) : spec.replace(/^\.?\.\//, '');
					mod.dependencies.add(modSpec);
					if (!moduleGraph.has(modSpec)) {
						moduleGraph.set(modSpec, { dependencies: new Set(), dependents: new Set(), acceptingUpdates: false });
					}

					const specModule = moduleGraph.get(modSpec);
					specModule.dependents.add(graphId);
					if (specModule.stale) {
						return addTimestamp(spec, Date.now());
					}

					if (originalSpec !== spec) {
						logJsTransform(`${kl.cyan(formatPath(originalSpec))} -> ${kl.dim(formatPath(spec))}`);
					}

					return spec;
				}
			});

			if (rewritten.map !== null) {
				if (sourceMap !== null) {
					// @ts-ignore
					sourceMap = mergeSourceMaps([sourceMap, rewritten.map]);
				} else {
					sourceMap = rewritten.map;
				}
			}
			code = rewritten.code;

			if (sourceMap !== null) {
				writeCacheFile(cacheKey + '.map', JSON.stringify(sourceMap));
				code = `${code}\n//# sourceMappingURL=${basename(id)}.map`;
			}
			writeCacheFile(cacheKey, code);

			return code;
		} catch (e) {
			const mod = moduleGraph.get(id);
			if (mod) {
				mod.hasErrored = true;
			}
			throw e;
		}
	},

	// Falls through to sirv
	async generic(ctx) {
		// Serve ~/200.html fallback for requests with no extension
		if (!/\.[a-z]+$/gi.test(ctx.path)) {
			const fallback = resolve(ctx.root, '200.html');
			let use200 = false;
			try {
				const hasFile = await fs.lstat(ctx.file).catch(() => false);
				use200 = !hasFile && !!(await fs.lstat(fallback));
			} catch (e) {}
			if (use200) {
				ctx.file = fallback;
				const mime = getMimeType(ctx.file) || 'text/html;charset=utf-8';
				ctx.res.setHeader('Content-Type', mime);
				return TRANSFORMS.asset(ctx);
			}
		}

		return false;
		// return new Promise((resolve, reject) => {
		// 	if (file.endsWith('/') || !file.match(/[^/]\.[a-z0-9]+$/gi)) {
		// 		file = file.replace(/\/$/, '') + '/index.html';
		// 	}
		// 	const fr = createReadStream(file);
		// 	// fr.once('data', () => res.writeHead(200));
		// 	fr.once('data', () => resolve());
		// 	fr.on('error', reject);
		// 	fr.pipe(res);
		// });
	}
};

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
