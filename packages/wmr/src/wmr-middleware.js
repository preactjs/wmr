import { resolve, dirname, relative, sep, posix, isAbsolute, normalize, basename } from 'path';
import { promises as fs, createReadStream } from 'fs';
import * as kl from 'kolorist';
import wmrPlugin, { getWmrClient } from './plugins/wmr/plugin.js';
import wmrStylesPlugin, { modularizeCss, processSass } from './plugins/wmr/styles-plugin.js';
import { createPluginContainer } from './lib/rollup-plugin-container.js';
import { transformImports } from './lib/transform-imports.js';
import { normalizeSpecifier } from './plugins/npm-plugin/index.js';
import sassPlugin from './plugins/sass-plugin.js';
import { getMimeType } from './lib/mimetypes.js';
import { debug, formatPath } from './lib/output-utils.js';
import { getPlugins } from './lib/plugins.js';
import { watch } from './lib/fs-watcher.js';
import { matchAlias, resolveAlias } from './lib/aliasing.js';

const NOOP = () => {};

const log = debug('wmr:middleware');

/**
 * In-memory cache of files that have been generated and written to .cache/
 * @type {Map<string, string | Buffer | Uint8Array>}
 */
const WRITE_CACHE = new Map();

export const moduleGraph = new Map();

/**
 * @param {import('wmr').BuildOptions & { distDir: string }} options
 * @returns {import('polka').Middleware}
 */
export default function wmrMiddleware(options) {
	let { cwd, root, out, distDir = 'dist', onError, onChange = NOOP } = options;

	distDir = resolve(dirname(out), distDir);

	const NonRollup = createPluginContainer(getPlugins(options), {
		cwd,
		writeFile: (filename, source) => writeCacheFile(out, filename, source),
		output: {
			// assetFileNames: '@asset/[name][extname]',
			// chunkFileNames: '[name][extname]',
			assetFileNames: '[name][extname]?asset',
			dir: out
		}
	});

	NonRollup.buildStart();

	const watcher = watch([cwd, resolve(root, 'package.json')], {
		cwd,
		disableGlobbing: true,
		ignored: [/(^|[/\\])(node_modules|\.git|\.DS_Store)([/\\]|$)/, resolve(cwd, out), resolve(cwd, distDir)]
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

	watcher.on('change', filename => {
		NonRollup.watchChange(resolve(cwd, filename));
		// normalize paths to 'nix:
		filename = filename.split(sep).join(posix.sep);

		// Delete any generated CSS Modules mapping modules:
		const suffix = /\.module\.(css|s[ac]ss)$/.test(filename) ? '.js' : '';
		WRITE_CACHE.delete(filename + suffix);

		if (!pendingChanges.size) timeout = setTimeout(flushChanges, 60);

		if (/\.(css|s[ac]ss)$/.test(filename)) {
			pendingChanges.add('/' + filename);
		} else if (/\.(mjs|[tj]sx?)$/.test(filename)) {
			if (!moduleGraph.has(filename)) {
				onChange({ reload: true });
				clearTimeout(timeout);
				return;
			}

			if (!bubbleUpdates(filename)) {
				pendingChanges.clear();
				clearTimeout(timeout);
				onChange({ reload: true });
			}
		} else {
			pendingChanges.clear();
			clearTimeout(timeout);
			onChange({ reload: true });
		}
	});

	return async (req, res, next) => {
		// @ts-ignore
		let path = posix.normalize(req.path);

		const queryParams = new URL(req.url, 'file://').searchParams;

		if (path.startsWith('/@npm/')) {
			return next();
		}

		let prefix = '';

		// Workaround for transform forcing extensionless ids to be
		// non-js
		let hasIdPrefix = false;

		let file = '';
		let id = path;

		// Path for virtual modules that refer to an unprefixed id.
		if (path.startsWith('/@id/')) {
			// Virtual paths have no exact file match, so we don't set `file`
			hasIdPrefix = true;
			id = path.slice('/@id/'.length);
		} else if (path.startsWith('/@alias/')) {
			id = posix.normalize(path.slice('/@alias/'.length));

			// Resolve to a file here for non-js Transforms
			file = resolveAlias(options.aliases, id);
		} else {
			const prefixMatches = path.match(/^\/?@([a-z-]+)(\/.+)$/);
			if (prefixMatches) {
				prefix = '\0' + prefixMatches[1] + ':';
				path = prefixMatches[2];
			}

			// convert to OS path:
			const osPath = path.slice(1).split(posix.sep).join(sep);

			file = resolve(cwd, osPath);

			// Rollup-style CWD-relative Unix-normalized path "id":
			id = relative(cwd, file).replace(/^\.\//, '').replace(/^[\0]/, '').split(sep).join(posix.sep);

			// add back any prefix if there was one:
			file = prefix + file;
			id = prefix + id;
		}

		let type = getMimeType(file);
		if (type) {
			res.setHeader('Content-Type', type);
		}

		log(`${kl.cyan(formatPath(path))} -> ${kl.dim(id)} file: ${kl.dim(file)}`);

		/** @type {(ctx: Context) => Result | Promise<Result>} */
		let transform;
		if (path === '/_wmr.js') {
			transform = getWmrClient.bind(null);
		} else if (queryParams.has('asset')) {
			transform = TRANSFORMS.asset;
		} else if (prefix || hasIdPrefix) {
			transform = TRANSFORMS.js;
		} else if (/\.(css|s[ac]ss)\.js$/.test(file)) {
			transform = TRANSFORMS.cssModule;
		} else if (/\.([mc]js|[tj]sx?)$/.test(file)) {
			transform = TRANSFORMS.js;
		} else if (/\.(css|s[ac]ss)$/.test(file)) {
			transform = TRANSFORMS.css;
		} else {
			transform = TRANSFORMS.generic;
		}

		try {
			const start = Date.now();
			const result = await transform({
				req,
				res,
				id,
				file,
				path,
				prefix,
				cwd,
				out,
				NonRollup,
				aliases: options.aliases
			});

			// return false to skip handling:
			if (result === false) return next();

			// return a value to use it as the response:
			if (result != null) {
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
 * @param {Record<string, string>} aliases
 * @returns
 */
function resolveFile(file, cwd, aliases) {
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
		for (const alias in aliases) {
			const value = aliases[alias];

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
 * @property {ReturnType<createPluginContainer>} NonRollup
 * @property {string} id rollup-style cwd-relative file identifier
 * @property {string} file absolute file path
 * @property {string} path request path
 * @property {string} prefix a Rollup plugin -style path `\0prefix:`, if the URL was `/＠prefix/*`
 * @property {string} cwd working directory, including ./public if detected
 * @property {string} out output directory
 * @property {Record<string, string>} aliases
 * @property {InstanceType<import('http')['IncomingMessage']>} req HTTP Request object
 * @property {InstanceType<import('http')['ServerResponse']>} res HTTP Response object
 */

const logJsTransform = debug('wmr:transform.js');

/** @typedef {string|false|Buffer|Uint8Array|null|void} Result */

/** @type {{ [key: string]: (ctx: Context) => Result|Promise<Result> }} */
export const TRANSFORMS = {
	// Handle direct asset requests (/foo?asset)
	async asset({ file, cwd, req, res }) {
		const filename = resolve(cwd, file);
		let stats;
		try {
			stats = await fs.stat(filename);
		} catch (e) {
			if (e.code === 'ENOENT') {
				res.writeHead(404);
				res.end();
				return;
			}
			throw e;
		}
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
	async js({ id, file, prefix, res, cwd, out, NonRollup, req, aliases }) {
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
				if (!isAbsolute(file)) file = resolve(cwd, file);
				code = await fs.readFile(resolveFile(file, cwd, aliases), 'utf-8');
			}

			code = await NonRollup.transform(code, id);

			code = await transformImports(code, id, {
				resolveImportMeta(property) {
					return NonRollup.resolveImportMeta(property);
				},
				async resolveId(spec, importer) {
					if (spec === 'wmr') return '/_wmr.js';
					if (/^(data:|https?:|\/\/)/.test(spec)) {
						logJsTransform(`${kl.cyan(formatPath(spec))} [external]`);
						return spec;
					}
					let graphId = importer.startsWith('/') ? importer.slice(1) : importer;
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
						if (/^(\/|\\|[a-z]:\\)/i.test(spec)) {
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

							spec = relative(cwd, spec).split(sep).join(posix.sep);
							if (!/^(\/|[\w-]+:)/.test(spec)) spec = `/${spec}`;
							return spec;
						}
					}

					// \0abc:foo --> /@abcF/foo
					spec = spec.replace(/^\0?([a-z-]+):(.+)$/, (s, prefix, spec) => {
						// \0abc:/abs/disk/path --> /@abc/cwd-relative-path
						if (spec[0] === '/' || spec[0] === sep) {
							spec = relative(cwd, spec).split(sep).join(posix.sep);
						}
						return '/@' + prefix + '/' + spec;
					});

					// foo.css --> foo.css.js (import of CSS Modules proxy module)
					if (spec.match(/\.(css|s[ac]ss)$/)) spec += '.js';

					// If file resolves outside of root it may be an aliased path.
					if (spec.startsWith('.')) {
						const aliased = matchAlias(aliases, posix.resolve(posix.dirname(file), spec));
						if (aliased) spec = aliased;
					}

					if (!spec.startsWith('/@alias/') && !/^\0?\.?\.?[/\\]/.test(spec)) {
						// Check if the spec is an alias
						const aliased = matchAlias(aliases, spec);
						if (aliased) spec = aliased;

						if (!spec.startsWith('/@alias/')) {
							// Check if this is a virtual module path from a plugin. If
							// no plugin loads the id, then we know that the bare specifier
							// must refer to an npm plugin.
							// TODO: Cache the result to avoid having to load an id twice.
							const res = await NonRollup.load(spec);

							if (res === null) {
								// Bare specifiers are npm packages:
								const meta = normalizeSpecifier(spec);

								// // Option 1: resolve all package verions (note: adds non-trivial delay to imports)
								// await resolvePackageVersion(meta);
								// // Option 2: omit package versions that resolve to the root
								// // if ((await resolvePackageVersion({ module: meta.module, version: '' })).version === meta.version) {
								// // 	meta.version = '';
								// // }
								// spec = `/@npm/${meta.module}${meta.version ? '@' + meta.version : ''}${meta.path ? '/' + meta.path : ''}`;

								// Option 3: omit root package versions
								spec = `/@npm/${meta.module}${meta.path ? '/' + meta.path : ''}`;
							} else {
								spec = `/@id/${spec}`;
							}
						}
					}

					const modSpec = spec.startsWith('../') ? spec.replace(/..\/g/, '') : spec.replace('./', '');
					mod.dependencies.add(modSpec);
					if (!moduleGraph.has(modSpec)) {
						moduleGraph.set(modSpec, { dependencies: new Set(), dependents: new Set(), acceptingUpdates: false });
					}

					const specModule = moduleGraph.get(modSpec);
					specModule.dependents.add(graphId);
					if (specModule.stale) {
						return spec + `?t=${Date.now()}`;
					}

					if (originalSpec !== spec) {
						logJsTransform(`${kl.cyan(formatPath(originalSpec))} -> ${kl.dim(formatPath(spec))}`);
					}

					return spec;
				}
			});

			writeCacheFile(out, id, code);

			return code;
		} catch (e) {
			const mod = moduleGraph.get(id);
			if (mod) {
				mod.hasErrored = true;
			}
			throw e;
		}
	},
	// Handles "CSS Modules" proxy modules (style.module.css.js)
	async cssModule({ id, file, cwd, out, res, aliases }) {
		res.setHeader('Content-Type', 'application/javascript;charset=utf-8');

		// Cache the generated mapping/proxy module with a .js extension (the CSS itself is also cached)
		if (WRITE_CACHE.has(id)) return WRITE_CACHE.get(id);

		file = file.replace(/\.js$/, '');

		// We create a plugin container for each request to prevent asset referenceId clashes
		const container = createPluginContainer(
			[wmrPlugin({ hot: true }), sassPlugin(), wmrStylesPlugin({ cwd, hot: true, fullPath: true, aliases })],
			{
				cwd,
				output: {
					dir: out,
					assetFileNames: '[name][extname]'
				},
				writeFile(filename, source) {
					writeCacheFile(out, filename, source);
				}
			}
		);

		const result = (await container.load(file)) || (await fs.readFile(resolveFile(file, cwd, aliases), 'utf-8'));

		let code = typeof result === 'string' ? result : result && result.code;

		code = await container.transform(code, file);

		code = await transformImports(code, id, {
			resolveImportMeta(property) {
				return container.resolveImportMeta(property);
			},
			resolveId(spec) {
				if (spec === 'wmr') return '/_wmr.js';
				console.warn('unresolved specifier: ', spec);
				return null;
			}
		});

		writeCacheFile(out, id, code);

		return code;
	},

	// Handles CSS Modules (the actual CSS)
	async css({ id, path, file, cwd, out, res, aliases }) {
		if (!/\.(css|s[ac]ss)$/.test(path)) throw null;

		const isModular = /\.module\.(css|s[ac]ss)$/.test(path);

		const isSass = /\.(s[ac]ss)$/.test(path);

		res.setHeader('Content-Type', 'text/css;charset=utf-8');

		if (WRITE_CACHE.has(id)) return WRITE_CACHE.get(id);

		const idAbsolute = resolveFile(file, cwd, aliases);
		let code = await fs.readFile(idAbsolute, 'utf-8');

		if (isModular) {
			code = await modularizeCss(code, id, undefined, idAbsolute);
		} else if (isSass) {
			code = processSass(code);
		}

		// const plugin = wmrStylesPlugin({ cwd, hot: false, fullPath: true });
		// let code;
		// const context = {
		// 	emitFile(asset) {
		// 		code = asset.source;
		// 	}
		// };
		// await plugin.load.call(context, file);

		writeCacheFile(out, id, code);

		return code;
	},

	// Falls through to sirv
	async generic(ctx) {
		// Serve ~/200.html fallback for requests with no extension
		if (!/\.[a-z]+$/gi.test(ctx.path)) {
			const fallback = resolve(ctx.cwd, '200.html');
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
 * Write a file to a directory, ensuring any nested paths exist
 * @param {string} rootDir
 * @param {string} fileName
 * @param {string|Buffer|Uint8Array} data
 */
async function writeCacheFile(rootDir, fileName, data) {
	if (fileName.includes('\0')) return;

	WRITE_CACHE.set(fileName, data);
	const filePath = resolve(rootDir, fileName);

	// Safeguard to avoid accidentally overwriting user files. If we throw here
	// we have very likely a bug in WMR.
	if (!filePath.startsWith(rootDir)) {
		throw new Error(`Attempting to write outside cache dir: ${filePath}`);
	}

	if (dirname(filePath) !== rootDir) {
		await fs.mkdir(dirname(filePath), { recursive: true });
	}
	await fs.writeFile(filePath, data);
}
