import { resolve, join } from 'path';
import { promises as fs } from 'fs';
import { readEnvFiles } from './environment.js';

/**
 * @template {{ cwd?: string, root?: string, out?: string, overlayDir?: string, aliases?: Record<string, string>, env?: Record<string, string>, middleware?: import('polka').Middleware[] }} T
 * @param {T} options
 * @returns {Promise<T>}
 */
export async function normalizeOptions(options) {
	options.cwd = resolve(options.cwd || '');
	process.chdir(options.cwd);

	options.root = options.cwd;

	options.middleware = [];

	const { NODE_ENV = 'development' } = process.env;
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

	// If the CWD has a public/ directory, all files are assumed to be within it.
	// From here, everything except node_modules and `out` are relative to public:
	if (await isDirectory(join(options.cwd, 'public'))) {
		options.cwd = join(options.cwd, 'public');
	}

	await ensureOutDirPromise;

	const pkgFile = resolve(options.root, 'package.json');
	const pkg = fs.readFile(pkgFile, 'utf-8').then(JSON.parse);
	options.aliases = (await pkg.catch(() => ({}))).alias || {};

	const hasMjsConfig = await isFile(resolve(options.root, 'wmr.config.mjs'));
	if (hasMjsConfig || (await isFile(resolve(options.root, 'wmr.config.js')))) {
		let custom,
			initialConfigFile = hasMjsConfig ? 'wmr.config.mjs' : 'wmr.config.js';
		try {
			custom = await import(resolve(options.root, initialConfigFile));
		} catch (e) {
			if (hasMjsConfig || !/import statement/.test(e)) {
				throw Error(`Failed to load ${initialConfigFile}\n${e}`);
			}
			// // Importing `wmr.config.js` failed: try copying it to `wmr.config.mjs` and importing that:
			// await fs.copyFile(resolve(options.root, 'wmr.config.js'), resolve(options.root, 'wmr.config.mjs'));
			// try {
			// 	custom = await import(resolve(options.root, 'wmr.config.mjs'));
			// } catch (e) {
			// 	throw Error(`Failed to load wmr.config.js\n${e}`);
			// } finally {
			// 	try {
			// 		await fs.unlink(resolve(options.root, 'wmr.config.mjs'));
			// 	} catch {}
			// }
		}
		Object.defineProperty(options, '_config', { value: custom });
		if (custom && custom.default) {
			custom.default(options);
		}
	}

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
