import { resolve, join } from 'path';
import { promises as fs } from 'fs';
import url from 'url';
import { readEnvFiles } from './environment.js';

/**
 * @template {Options} T
 * @param {Partial<T>} options
 * @param {Mode} mode
 * @returns {Promise<T>}
 */
export async function normalizeOptions(options, mode) {
	options.cwd = resolve(options.cwd || '');
	process.chdir(options.cwd);

	options.root = options.cwd;

	options.plugins = [];
	options.output = [];
	options.middleware = [];
	options.features = { preact: true };

	// `wmr` / `wmr start` is a development command.
	// `wmr build` / `wmr serve` are production commands.
	const prod = mode !== 'start';
	options.prod = prod;
	options.mode = mode;

	const NODE_ENV = process.env.NODE_ENV || (prod ? 'production' : 'development');
	options.env = await readEnvFiles(options.root, ['.env', '.env.local', `.env.${NODE_ENV}`, `.env.${NODE_ENV}.local`]);

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

	// If the CWD has a public/ directory, all files are assumed to be within it.
	// From here, everything except node_modules and `out` are relative to public:
	if (options.public !== '.' && (await isDirectory(join(options.cwd, options.public)))) {
		options.cwd = join(options.cwd, options.public);
	}

	await ensureOutDirPromise;

	const pkgFile = resolve(options.root, 'package.json');
	const pkg = fs.readFile(pkgFile, 'utf-8').then(JSON.parse);
	options.aliases = (await pkg.catch(() => ({}))).alias || {};

	const hasMjsConfig = await isFile(resolve(options.root, 'wmr.config.mjs'));
	if (hasMjsConfig || (await isFile(resolve(options.root, 'wmr.config.js')))) {
		let custom,
			initialConfigFile = hasMjsConfig ? 'wmr.config.mjs' : 'wmr.config.js',
			initialError;
		try {
			const resolved = resolve(options.root, initialConfigFile);
			const fileUrl = url.pathToFileURL(resolved);
			// Note: the eval() below is to prevent Rollup from transforming import() and require().
			// Using the native functions allows us to load ESM and CJS with Node's own semantics.
			try {
				custom = await eval('(x => import(x))')(fileUrl);
			} catch (err) {
				initialError = err;
				custom = eval('(x => require(x))')(fileUrl);
			}
		} catch (e) {
			if (hasMjsConfig || !/import statement/.test(e)) {
				throw Error(`Failed to load ${initialConfigFile}\n${initialError}\n${e}`);
			}
		}
		Object.defineProperty(options, '_config', { value: custom });
		if (custom) {
			if (custom.default) await custom.default(options);
			if (custom[mode]) await custom[mode](options);
		}
	}

	// @ts-ignore-next
	return options;
}

function isDirectory(path) {
	return fs
		.stat(path)
		.then(s => s.isDirectory())
		.catch(() => false);
}

function isFile(path) {
	return fs
		.stat(path)
		.then(s => s.isFile())
		.catch(() => false);
}
