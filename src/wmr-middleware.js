import { resolve, dirname, relative, sep, posix } from 'path';
import { promises as fs } from 'fs';
import chokidar from 'chokidar';
import mime from 'mime/lite.js';
import htmPlugin from './plugins/htm-plugin.js';
import sucrasePlugin from './plugins/sucrase-plugin.js';
import wmrPlugin, { getWmrClient } from './plugins/wmr/plugin.js';
import wmrStylesPlugin, { modularizeCss } from './plugins/wmr/styles-plugin.js';
import { createPluginContainer } from './lib/rollup-plugin-container.js';
import { transformImports } from './lib/transform-imports.js';
import aliasesPlugin from './plugins/aliases-plugin.js';
import urlPlugin from './plugins/url-plugin.js';
import { normalizeSpecifier } from './plugins/npm-plugin/index.js';
import bundlePlugin from './plugins/bundle-plugin.js';
// import { resolvePackageVersion } from './plugins/npm-plugin/registry.js';

/**
 * In-memory cache of files that have been generated and written to .cache/
 * @type {Map<string, string | Buffer>}
 */
const WRITE_CACHE = new Map();

/**
 * @param {object} [options]
 * @param {string} [options.cwd]
 * @param {string} [options.root] cwd without ./public suffix
 * @param {string} [options.out = '.cache']
 * @param {string} [options.distDir] if set, ignores watch events within this directory
 * @param {boolean} [options.sourcemap]
 * @param {Record<string, string>} [options.aliases]
 * @param {boolean} [options.profile] Enable bundler performance profiling
 * @param {(error: Error & { clientMessage?: string })=>void} [options.onError]
 * @param {(event: { changes: string[], duration: number })=>void} [options.onChange]
 * @returns {import('polka').Middleware}
 */
export default function wmrMiddleware({
	cwd,
	root,
	out = '.cache',
	distDir = 'dist',
	aliases,
	onError,
	onChange
} = {}) {
	cwd = resolve(process.cwd(), cwd || '.');
	distDir = resolve(dirname(out), distDir);

	root = root || cwd;

	const NonRollup = createPluginContainer(
		[
			urlPlugin({ inline: true, cwd }),
			bundlePlugin({ inline: true, cwd }),
			aliasesPlugin({ aliases, cwd: root }),
			sucrasePlugin({
				typescript: true,
				sourcemap: false,
				production: false
			}),
			aliasesPlugin({ aliases }),
			htmPlugin(),
			wmrPlugin({ hot: true }),
			{
				name: 'direct-asset-urls',
				resolveFileUrl({ fileName }) {
					return JSON.stringify(`/${fileName}?asset`);
				}
			}
		],
		{
			cwd,
			writeFile: (filename, source) => writeCacheFile(out, filename, source),
			output: {
				// assetFileNames: '@asset/[name][extname]',
				// chunkFileNames: '[name][extname]',
				assetFileNames: '[name][extname]?asset',
				dir: out
			}
		}
	);

	NonRollup.buildStart();

	let useFsEvents = false;
	try {
		eval('require')('fsevents');
		useFsEvents = true;
	} catch (e) {}

	const watcher = chokidar.watch([cwd, resolve(root, 'package.json')], {
		cwd,
		disableGlobbing: true,
		ignored: [/(^|[/\\])(node_modules|\.git|\.DS_Store)([/\\]|$)/, resolve(cwd, out), resolve(cwd, distDir)],
		useFsEvents
	});
	const pendingChanges = new Set();

	function flushChanges() {
		onChange({ changes: Array.from(pendingChanges), duration: 0 });
		pendingChanges.clear();
	}
	watcher.on('change', filename => {
		NonRollup.watchChange(resolve(cwd, filename));
		// normalize paths to 'nix:
		filename = filename.split(sep).join(posix.sep);
		if (!pendingChanges.size) setTimeout(flushChanges, 60);
		pendingChanges.add('/' + filename);
		// Delete file from the in-memory cache:
		WRITE_CACHE.delete(filename);
		// Delete any generated CSS Modules mapping modules:
		if (/\.module\.css$/.test(filename)) WRITE_CACHE.delete(filename + '.js');
	});

	return async (req, res, next) => {
		// @ts-ignore
		let path = posix.normalize(req.path);

		const queryParams = new URL(req.url, 'file://').searchParams;

		if (path.startsWith('/@npm/')) {
			return next();
		}

		let prefix = '';
		const prefixMatches = path.match(/^\/?@([a-z-]+)(\/.+)$/);
		if (prefixMatches) {
			prefix = '\0' + prefixMatches[1] + ':';
			path = prefixMatches[2];
		}

		// convert to OS path
		const osPath = path.slice(1).split(posix.sep).join(sep);

		let file = resolve(cwd, osPath);

		// Rollup-style CWD-relative path "id"
		let id = relative(cwd, file).replace(/^\.\//, '');

		file = prefix + file;
		id = prefix + id;

		const type = mime.getType(file);
		if (type) res.setHeader('content-type', type);

		const ctx = { req, res, id, file, path, cwd, out, NonRollup, next };

		let transform;
		if (path === '/_wmr.js') {
			transform = getWmrClient.bind(null);
		} else if (queryParams.has('asset')) {
			transform = TRANSFORMS.asset;
		} else if (prefix) {
			transform = TRANSFORMS.js;
		} else if (/\.css\.js$/.test(file)) {
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
			const result = await transform(ctx);

			// return false to skip handling:
			if (result === false) return next();

			// return a value to use it as the response:
			if (result != null) {
				const time = Date.now() - start;
				// console.log(result);
				res.writeHead(200, {
					'content-length': result.length,
					'server-timing': `${transform.name};dur=${time}`
				});
				res.end(result);
			}
		} catch (e) {
			// `throw null` also skips handling
			if (e == null) return next();

			onError(e);
			next(e);
		}
	};
}

export const TRANSFORMS = {
	// Handle direct asset requests (/foo?asset)
	async asset({ file }) {
		return await fs.readFile(file);
	},

	// Handle individual JavaScript modules
	/** @param {object} opts @param {ReturnType<createPluginContainer>} [opts.NonRollup] */
	async js({ id, file, res, cwd, out, NonRollup }) {
		res.setHeader('content-type', 'application/javascript');

		const cacheKey = id.replace(/^[\0\b]/, '');

		if (WRITE_CACHE.has(cacheKey)) return WRITE_CACHE.get(cacheKey);

		const result = await NonRollup.load(file);

		let code = (result && result.code) || result;

		if (code == null || code === false) {
			code = await fs.readFile(resolve(cwd, file), 'utf-8');
		}

		code = await NonRollup.transform(code, id);

		code = await transformImports(code, id, {
			resolveImportMeta(property) {
				return NonRollup.resolveImportMeta(property);
			},
			async resolveId(spec, importer) {
				if (spec === 'wmr') return '/_wmr.js';

				if (/^(data|https?):/.test(spec)) return spec;

				// const resolved = await NonRollup.resolveId(spec, importer);
				const resolved = await NonRollup.resolveId(spec, file);
				if (resolved) {
					spec = (resolved && resolved.id) || resolved;
					if (/^(\/|\\|[a-z]:\\)/i.test(spec[0])) {
						spec = relative(dirname(file), spec).split(sep).join(posix.sep);
						if (!/^\.?\.?\//.test(spec)) {
							spec = './' + spec;
						}
					}
					if (resolved && resolved.external) {
						// console.log('external: ', spec);
						if (/^(data|https?):/.test(spec)) return spec;

						spec = relative(cwd, spec).split(sep).join(posix.sep);
						if (!/^(\/|[\w-]+:)/.test(spec)) spec = `/${spec}`;
						return spec;
					}
				}

				// \0abc:./x --> /@abc/x
				spec = spec.replace(/^\0?([a-z-]+):(.+)$/, (s, prefix, spec) => {
					// console.log(spec, relative(cwd, spec).split(sep).join(posix.sep));
					return '/@' + prefix + '/' + relative(cwd, spec).split(sep).join(posix.sep);
				});

				// foo.css --> foo.css.js (import of CSS Modules proxy module)
				if (spec.endsWith('.css')) spec += '.js';

				// Bare specifiers are npm packages:
				if (!/^\.?\.?[/\\]/.test(spec)) {
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
				}

				return spec;
			}
		});

		writeCacheFile(out, cacheKey, code);

		return code;
	},

	// Handles "CSS Modules" proxy modules (style.module.css.js)
	async cssModule({ id, file, cwd, out, res }) {
		res.setHeader('content-type', 'application/javascript');

		// Cache the generated mapping/proxy module with a .js extension (the CSS itself is also cached)
		if (WRITE_CACHE.has(id)) return WRITE_CACHE.get(id);

		file = file.replace(/\.js$/, '');

		// We create a plugin container for each request to prevent asset referenceId clashes
		const container = createPluginContainer(
			[wmrPlugin({ hot: true }), wmrStylesPlugin({ cwd, hot: true, fullPath: true })],
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

		const result = await container.load(file);

		let code = typeof result === 'string' ? result : result && result.code;

		code = await container.transform(code, id);

		code = await transformImports(code, id, {
			resolveImportMeta(property) {
				return container.resolveImportMeta(property);
			},
			resolveId(spec) {
				if (spec === 'wmr') return '/_wmr.js';
				console.warn('unresolved specifier: ', spec);
			}
		});

		writeCacheFile(out, id, code);

		return code;
	},

	// Handles CSS Modules (the actual CSS)
	async css({ id, path, file, cwd, out }) {
		if (!/\.module\.css$/.test(path)) throw null;

		if (WRITE_CACHE.has(id)) return WRITE_CACHE.get(id);

		let code = await fs.readFile(resolve(cwd, file), 'utf-8');

		code = modularizeCss(code, id);

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
	generic() {
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
 * @param {string|Buffer} data
 */
async function writeCacheFile(rootDir, fileName, data) {
	WRITE_CACHE.set(fileName, data);
	const filePath = resolve(rootDir, fileName);
	if (dirname(filePath) !== rootDir) {
		await fs.mkdir(dirname(filePath), { recursive: true });
	}
	await fs.writeFile(filePath, data);
}
