import { promises as fs } from 'fs';

/**
 * Implementation of fs.rm() for Node 12+
 * See: https://nodejs.org/api/fs.html#fs_fspromises_rm_path_options
 * @param {string | Buffer | URL} path
 * @param {{ force?: boolean, maxRetries?: number, recursive?: boolean, retryDelay?: number }} [options]
 */
export async function rm(path, options) {
	if (fs.rm) return fs.rm(path, options);
	options = options || {};
	const stats = await fs.stat(path);
	if (stats.isDirectory()) return fs.rmdir(path, options);
	return fs.unlink(path);
}

export function isDirectory(path) {
	return fs
		.stat(path)
		.then(s => s.isDirectory())
		.catch(() => false);
}

export function isFile(path) {
	return fs
		.stat(path)
		.then(s => s.isFile())
		.catch(() => false);
}
