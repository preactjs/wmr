import { join, normalize, resolve, relative, dirname, posix } from 'path';
import { promises as fs } from 'fs';
import chokidar from 'chokidar';
import mime from 'mime/lite.js';
import htmPlugin from './plugins/htm-plugin.js';
import wmrPlugin, { getWmrClient } from './plugins/wmr/plugin.js';
import wmrStylesPlugin, { hash } from './plugins/wmr/styles-plugin.js';
import { createHash } from 'crypto';
import { createPluginContainer } from './lib/rollup-plugin-container.js';
import { compileSingleModule } from './lib/compile-single-module.js';

/**
 * @param {object} [options]
 * @param {string} [options.cwd]
 * @param {string} [options.out = '.dist']
 * @param {string} [options.distDir] if set, ignores watch events within this directory
 * @param {boolean} [options.sourcemap]
 * @param {boolean} [options.profile] Enable bundler performance profiling
 * @param {(error: Error & { clientMessage?: string })=>void} [options.onError]
 * @param {(event: { changes: string[], duration: number })=>void} [options.onChange]
 * @returns {import('polka').Middleware}
 */
export default function wmrMiddleware({ cwd, out = '.dist', distDir = 'dist', onError, onChange } = {}) {
	cwd = resolve(process.cwd(), cwd || '.');
	distDir = resolve(dirname(out), distDir);

	let useFsEvents = false;
	try {
		eval('require')('fsevents');
		useFsEvents = true;
	} catch (e) {}

	const watcher = chokidar.watch(cwd, {
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
	watcher.on('change', (filename, stats) => {
		if (!pendingChanges.size) setTimeout(flushChanges, 60);
		pendingChanges.add('/' + filename);
	});

	return async (req, res, next) => {
		// @ts-ignore
		const path = posix.normalize(req.path);
		const file = posix.join(cwd, path);
		// rollup-style cwd-relative path ID
		const id = posix.relative(cwd, file).replace(/^\.\//, '');

		const type = mime.getType(file);
		if (type) res.setHeader('content-type', type);

		const ctx = { req, res, id, file, path, cwd, out, next };

		/** @TODO if there's a cached version of the requested module in .dist/, serve it. */

		let transform;
		if (path === '/_wmr.js') {
			transform = getWmrClient.bind(null);
		} else if (/\.css\.js$/.test(file)) {
			transform = TRANSFORMS.cssModule;
		} else if (/\.([mc]js|[tj]sx?)$/.test(file)) {
			// transform = async ctx => {
			// 	let time = Date.now();
			// 	let ret = await TRANSFORMS.js_bundled(ctx);
			// 	const bundledTime = Date.now() - time;
			// 	time = Date.now();
			// 	ret = await TRANSFORMS.js(ctx);
			// 	const rawTime = Date.now() - time;
			// 	console.log(`Bundled: ${bundledTime}ms, Raw: ${rawTime}ms`);
			// 	return ret;
			// };
			// transform = TRANSFORMS.js_bundled;
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

// const pluginInstances = new Map();

// /**
//  * @template {(opts: any?) => any} T
//  * @param {T} factory
//  * @param {Parameters<T>[0]} [opts]
//  */
// function getPluginInstance(factory, opts) {
// 	let instance = pluginInstances.get(factory);
// 	if (!instance) {
// 		instance = factory(opts);
// 		pluginInstances.set(factory, instance);

// 		let options = { acornInjectPlugins: [] };
// 		options = (await instance.options.call(ctx, options)) || options;
// 		parser = acorn.Parser.extend(...options.acornInjectPlugins);
// 	}
// 	return instance;
// }

const NonRollup = createPluginContainer([wmrPlugin(), htmPlugin()]);

export const TRANSFORMS = {
	async js_test(ctx) {
		let time = Date.now();
		let ret = await TRANSFORMS.js_bundled(ctx);
		const bundledTime = Date.now() - time;
		time = Date.now();
		ret = await TRANSFORMS.js(ctx);
		const rawTime = Date.now() - time;
		console.log(`Bundled: ${bundledTime}ms, Raw: ${rawTime}ms`);
		return ret;
	},

	// non-rollup-based straight transform (still uses Acorn + rollup plugins)
	async js({ id, file, res, cwd, out }) {
		const input = resolve(cwd, file);
		let code = await fs.readFile(input, 'utf-8');
		// let parser = acorn.Parser;
		// const ctx = {
		// 	parse: (code, opts) => {
		// 		return parser.parse(code, {
		// 			sourceType: 'module',
		// 			ecmaVersion: 2020,
		// 			locations: true,
		// 			onComment: [],
		// 			...opts
		// 		});
		// 	}
		// };
		// const wmr = getPluginInstance(wmrPlugin);
		// const htm = getPluginInstance(htmPlugin);
		// let options = { acornInjectPlugins: [] };
		// options = (await htm.options.call(ctx, options)) || options;
		// parser = acorn.Parser.extend(...options.acornInjectPlugins);

		// let result = await htm.transform.call(ctx, code, id);
		// code = (result && result.code) || result || code;

		// result = await wmr.transform.call(ctx, code, id);
		// code = (result && result.code) || result || code;

		code = await NonRollup.transform(code, id);

		code = code.replace(
			/\bimport\.meta\.([a-zA-Z_$][a-zA-Z0-9_$]*)\b/g,
			(str, property) => NonRollup.resolveImportMeta(property) || str
		);

		code = code.replace(
			/\b(import\s*(?:(?:\{.*?\}(?:\s*,\s*[\w$]+(?:\s+as\s+[\w$]+)?)?|[\w$]+(?:\s+as\s+[\w$]+)?(?:\s*,\s*\{.*?\})?)\s*from\s*)?)(['"])(.*?)\2/g,
			(str, pre, q, spec) => {
				// console.log(spec);
				if (spec.endsWith('.css')) spec += '.js';
				if (spec === 'wmr') {
					spec = '/_wmr.js';
				} else if (spec[0] !== '.' && spec[0] !== '/') {
					spec = `/@npm/${spec}`;
				}
				return `${pre}${q}${spec}${q}`;
			}
		);
		res.setHeader('content-type', 'application/javascript');

		writeCacheFile(out, id, code);

		return code;
	},

	async js_bundled({ id, file, res, cwd, out }) {
		const input = resolve(cwd, file);
		// const input = resolve(process.cwd(), file);
		const code = await compileSingleModule(input, { cwd, out });
		res.setHeader('content-type', 'application/javascript');
		return code;
	},

	async cssModule({ id, file, cwd, out, res }) {
		// if (/\.module\.css$/.test(file)) {
		id = id.replace(/\.js$/, '');
		file = file.replace(/\.js$/, '');
		const plugin = wmrStylesPlugin({ cwd });
		const files = new Map();
		let ids = 0;
		const ctx = {
			meta: {},
			emitFile({ type, name, source }) {
				if (type !== 'asset') throw Error(`Unsupported type ${type}`);
				const id = String(++ids);
				const hash = createHash('md5').update(source).digest('hex').substring(0, 5);
				const filename = resolve(out, name).replace(/([^/]+?)(\.[\w]+)?$/, `$1-${hash}$2`);
				// console.log('emitFile', name, filename);
				files.set(id, { id, name, filename });
				fs.writeFile(filename, source);
				return id;
			}
		};
		await plugin.options.call(ctx, { input: cwd + '/_.js' });
		const result = await plugin.load.call(ctx, file);
		// console.log(id, result);
		let code = (result && result.code) || result;
		res.setHeader('content-type', 'application/javascript');
		const wmr = wmrPlugin();
		code = code.replace(/\bimport\.meta\.([\w$]+)/g, (str, property) => {
			return wmr.resolveImportMeta.call(ctx, property) || str;
		});
		const transformed = await wmr.transform.call(ctx, code, id);
		code = (transformed && transformed.code) || transformed || code;
		return code.replace(/(['"])wmr\1/g, '$1/_wmr.js$1').replace(/import\.meta\.ROLLUP_FILE_URL_(\d+)/g, (s, id) => {
			return JSON.stringify('/' + relative(out, files.get(id).filename));
		});

		// alternative inline version (no HMR support)
		// let source = await fs.readFile(file, 'utf-8');
		// let mappings = [];
		// if (id.match(/\.module\.css$/)) {
		// 	const suffix = '_' + hash(id);
		// 	source = source.replace(/\.([a-z0-9_-]+)/gi, (str, className) => {
		// 		const mapped = className + suffix;
		// 		const q = /^\d|[^a-z0-9_$]/gi.test(className) ? `'` : ``;
		// 		mappings.push(`${q + className + q}:'${mapped}'`);
		// 		return `.${mapped}`;
		// 	});
		// }
		// }
		// return TRANSFORMS.generic({ file, res });
	},

	async css({ id, path, file, cwd }) {
		if (!/\.module\.css$/.test(path)) throw null;
		let source = await fs.readFile(file, 'utf-8');
		let mappings = [];
		if (id.match(/\.module\.css$/)) {
			const suffix = '_' + hash(id);
			source = source.replace(/\.([a-z0-9_-]+)/gi, (str, className) => {
				const mapped = className + suffix;
				const q = /^\d|[^a-z0-9_$]/gi.test(className) ? `'` : ``;
				mappings.push(`${q + className + q}:'${mapped}'`);
				return `.${mapped}`;
			});
		}
		return source;
	},

	generic({ file, res }) {
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
	const filePath = resolve(rootDir, fileName);
	if (dirname(filePath) !== rootDir) {
		await fs.mkdir(dirname(filePath), { recursive: true });
	}
	await fs.writeFile(filePath, data);
}
