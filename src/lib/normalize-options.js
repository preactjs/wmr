import { resolve, join } from 'path';
import { promises as fs } from 'fs';

/**
 * @template {{ cwd?: string, root?: string, out?: string, overlayDir?: string, aliases?: Record<string, string> }} T
 * @param {T} options
 * @returns {Promise<T>}
 */
export async function normalizeOptions(options) {
	options.cwd = resolve(options.cwd || '');

	options.root = options.cwd;

	// Output directory is relative to CWD *before* ./public is detected + appended:
	options.out = resolve(options.cwd, options.out || '.dist');

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

	return options;
}

function isDirectory(path) {
	return fs
		.stat(path)
		.then(s => s.isDirectory())
		.catch(() => false);
}
