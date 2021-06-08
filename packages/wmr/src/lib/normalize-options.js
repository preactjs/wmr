import { resolve, join } from 'path';
import { promises as fs } from 'fs';
import url from 'url';
import { isFile, isDirectory } from './fs-utils.js';
import { getWmrEnvVars, readEnvFiles } from './environment.js';
import { compileSingleModule } from './compile-single-module.js';
import { debug, deprecated, setDebugCliArg } from './output-utils.js';
import { getPort, supportsSearchParams } from './net-utils.js';

/**
 * @param {Partial<Options>} options
 * @param {Mode} mode
 * @param {string[]} [configWatchFiles]
 * @returns {Promise<Options>}
 */
export async function normalizeOptions(options, mode, configWatchFiles = []) {
	options.cwd = resolve(options.cwd || '');
	process.chdir(options.cwd);

	if (options.debug) setDebugCliArg(true);

	options.root = options.cwd;

	options.sourcemap = false;
	options.minify = mode === 'build';
	options.plugins = [];
	options.output = [];
	options.middleware = [];
	options.features = { preact: true };
	options.alias = options.alias || options.aliases || {};
	options.routesDir = join(options.cwd, options.routesDir || 'pages');

	// `wmr` / `wmr start` is a development command.
	// `wmr build` / `wmr serve` are production commands.
	const prod = mode !== 'start';
	options.prod = prod;
	options.mode = mode;

	const NODE_ENV = process.env.NODE_ENV || (prod ? 'production' : 'development');
	const envFileVars = await readEnvFiles(
		options.root,
		['.env', '.env.local', `.env.${NODE_ENV}`, `.env.${NODE_ENV}.local`],
		configWatchFiles
	);
	options.env = {
		...getWmrEnvVars(),
		...envFileVars
	};

	// Output directory is relative to CWD *before* ./public is detected + appended:
	options.out = resolve(options.cwd, options.out || '.cache');

	// Files in the output directory are served if no middleware overrides them:
	options.overlayDir = options.out;

	// Ensure the output directory exists so that writeFile() doesn't have to create it:
	// Note: awaiting the promise later lets it run in parallel with the CWD check below.
	const ensureOutDirPromise = fs.mkdir(options.out, { recursive: true }).catch(err => {
		console.warn(`Warning: Failed to create output directory: ${err.message}`);
	});

	options.public = options.public || 'public';
	options.publicPath = options.publicPath || '/';

	// https://cdn.example.com => https://cdn.example.com/
	if (!options.publicPath.endsWith('/')) {
		options.publicPath += '/';
	}

	options.host = process.env.HOST || options.host || 'localhost';
	if (mode !== 'build') {
		options.port = await getPort(options);
	}

	// FIXME: We cannot support eagerly passing `options.public` into config AND
	// allowing plugins to lazily change them at the same time. Otherwise they'll
	// get out of sync. This is design issue of our current plugin system, not a
	// mere bug. The following snippet is a hotfix to get our docs site working
	// again.
	//
	// If the CWD has a public/ directory, all files are assumed to be within it.
	// From here, everything except node_modules and `out` are relative to public:
	if (options.public !== '.' && (await isDirectory(join(options.cwd, options.public)))) {
		options.cwd = join(options.cwd, options.public);
	}

	let prevPublicFolder = options.public;
	await ensureOutDirPromise;

	const pkgFile = resolve(options.root, 'package.json');
	let pkg;
	try {
		pkg = JSON.parse(await fs.readFile(pkgFile, 'utf-8'));
		Object.assign(options.alias, pkg.alias || {});
		configWatchFiles.push(pkgFile);
	} catch (e) {
		// ignore error, reading aliases from package.json is an optional feature
	}

	const EXTENSIONS = ['.ts', '.js', '.mjs'];

	let custom;
	let initialError;
	for (const ext of EXTENSIONS) {
		const file = resolve(options.root, `wmr.config${ext}`);
		if (await isFile(file)) {
			let configFile = file;
			configWatchFiles.push(configFile);

			if (ext === '.ts') {
				// Create a temporary file to write compiled output into
				// TODO: Do this in memory
				configFile = resolve(options.root, 'wmr.config.js');
				await compileSingleModule(file, {
					cwd: options.cwd,
					out: resolve('.'),
					hmr: false,
					rewriteNodeImports: false,
					format: pkg && pkg.type === 'module' ? 'es' : 'commonjs'
				});
			}

			const fileUrl = url.pathToFileURL(configFile);
			try {
				// Node <= 12.18.4 returns an empty module if we append search params to
				// the URL.
				const importSource = supportsSearchParams ? `(x => import(x + '?t=${Date.now()}'))` : `(x => import(x))`;
				custom = await eval(importSource)(fileUrl.toString());

				// We found our config file
				break;
			} catch (err) {
				// eslint-disable-next-line no-console
				console.log(err);
				initialError = err;
				try {
					custom = eval('(x => require(x))')(fileUrl);
				} catch (err2) {
					if (ext === '.mjs' || !/import statement/.test(err2)) {
						throw Error(`Failed to load wmr.config${ext}\n${initialError}\n${err2}`);
					}
				}
			} finally {
				// Remove temporary file
				if (ext === '.ts') {
					fs.unlink(configFile);
				}
			}
		}
	}

	/**
	 * @param {keyof import('wmr').Plugin} name
	 * @param {import('wmr').Plugin[]} plugins
	 */
	const runConfigHook = async (name, plugins) => {
		for (const plugin of plugins) {
			if (!plugin[name]) return;

			const res = await plugin[name](options);
			if (res) {
				if (res.plugins) {
					throw new Error(`In plugin ${plugin.name}: Plugin method "${name}()" must not return a "plugins" property.`);
				}
				options = mergeConfig(options, res);
			}
		}
	};

	/**
	 * @param {any} x
	 * @returns {x is import('wmr').Plugin}
	 */
	const isPlugin = x => Object.keys(x).some(key => typeof x[key] === 'function');

	/**
	 * @param {Options | import('wmr').Plugin | import('wmr').Plugin []} res
	 */
	const applyConfigResult = res => {
		if (res) {
			if (Array.isArray(res) || isPlugin(res)) {
				options.plugins = options.plugins.concat(res);
			} else {
				options = mergeConfig(options, res);
			}
		}
	};

	if (custom) {
		if (custom.default) {
			const res = typeof custom.default === 'function' ? await custom.default(options) : custom.default;
			applyConfigResult(res);
		}
		if (custom[mode]) {
			const res = await custom[mode](options);
			applyConfigResult(res);
		}
	}

	if (options.aliases && Object.keys(options.aliases).length > 0) {
		deprecated(
			'Found "aliases" property in WMR\'s configuration. It will be removed in a future version of WMR. Please switch to "alias" instead.'
		);
		Object.assign(options.alias, options.aliases);
	}

	// Sort plugins by "enforce" phase. Default is "normal".
	// The execution order is: "pre" -> "normal" -> "post"
	if (options.plugins) {
		options.plugins = options.plugins.flat().sort((a, b) => {
			const aScore = a.enforce === 'post' ? 1 : a.enforce === 'pre' ? -1 : 0;
			const bScore = b.enforce === 'post' ? 1 : b.enforce === 'pre' ? -1 : 0;
			return aScore - bScore;
		});
	}

	await runConfigHook('config', options.plugins);
	await runConfigHook('configResolved', options.plugins);

	if (prevPublicFolder !== options.public) {
		// If the CWD has a public/ directory, all files are assumed to be within it.
		// From here, everything except node_modules and `out` are relative to public:
		if (options.public !== '.' && (await isDirectory(join(options.cwd, options.public)))) {
			options.cwd = join(options.cwd, options.public);
		}
	}

	// Add src as a default alias if such a folder is present
	if (!('src/*' in options.alias)) {
		const maybeSrc = resolve(options.root, 'src');
		if (
			// Don't add src alias if we are serving from that folder already
			maybeSrc !== options.cwd &&
			(await isDirectory(maybeSrc))
		) {
			options.alias['src/*'] = maybeSrc;
		}
	}

	// Resolve path-like alias mapping to absolute paths
	for (const name in options.alias) {
		if (name.endsWith('/*')) {
			const value = options.alias[name];
			options.alias[name] = resolve(options.root, value);
		}
	}

	debug('wmr:config')(options);

	// @ts-ignore-next
	return options;
}

/**
 * Deeply merge two config objects
 * @template {Record<string, any>} T
 * @template {Record<string, any>} U
 * @param {T} a
 * @param {U} b
 * @returns {T & U}
 */
function mergeConfig(a, b) {
	/** @type {any} */
	const merged = { ...a };

	for (const key in b) {
		const value = b[key];
		if (value == null) {
			continue;
		}

		const existing = merged[key];
		if (Array.isArray(existing) && Array.isArray(value)) {
			merged[key] = [...existing, ...value];
		} else if (existing !== null && typeof existing === 'object' && typeof value === 'object') {
			merged[key] = mergeConfig(existing, value);
		} else {
			merged[key] = value;
		}
	}

	return merged;
}
