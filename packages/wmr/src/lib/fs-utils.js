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

/**
 * Check if an id contains a custom prefix
 * @param {string} id
 * @returns {boolean}
 */
export function hasCustomPrefix(id) {
	// Windows disk letters are not prefixes: C:/foo
	return !/^\0?(?:file|https?):\/\//.test(id) && /^\0?[-\w]{2,}:/.test(id);
}

/**
 * Convert a file path to a valid URL path. For example, it replaces windows
 * path separators with URL path separators.
 * @param {string} p
 * @returns {string}
 */
export function pathToUrl(p) {
	return p.replace(/\\/g, '/');
}

/**
 * Read a file as JSON
 * @param {string} file
 */
export async function readJson(file) {
	const raw = await fs.readFile(file, 'utf-8');
	return JSON.parse(raw);
}
