import { promises as fs } from 'fs';
import * as path from 'path';

/**
 * Check if a file exists on disk
 * @param {string} filePath
 * @returns {Promise<boolean>}
 */
export async function fileExists(filePath) {
	try {
		if ((await fs.stat(filePath)).isFile()) {
			return true;
		}
	} catch (e) {}
	return false;
}

/**
 * Ensure that a file path resolves to a file in one of the allowed
 * directories to include files from.
 * @param {string} file Absolute path to file
 * @param {string} cwd
 * @param {string[]} includeDirs
 */
export function resolveFile(file, cwd, includeDirs) {
	file = !path.isAbsolute(file) ? path.resolve(cwd, file) : path.normalize(file);

	for (let dir of includeDirs) {
		if (!path.relative(dir, file).startsWith('..')) {
			return file;
		}
	}

	const err = new Error(
		`Unable to resolve ${file}. Files must be placed in one of the following directories:\n` +
			`  ${includeDirs.join('\n  ')}`
	);
	// Used by top level error handler to rewrite it to a 404
	err.code = 'ENOENT';
	throw err;
}

/**
 * Normalize path to use unix style separators `/`
 * @param {string} file
 * @returns {string}
 */
export function normalizePath(file) {
	return file.split(path.sep).join(path.posix.sep);
}

/**
 * Serialize import specifier for clients.
 * @param {string} file
 * @param {string} cwd
 * @param {string[]} includeDirs
 * @param {object} [options]
 * @param {string} [options.importer]
 * @param {boolean} [options.forceAbsolute]
 */
export function serializeSpecifier(file, cwd, includeDirs, { importer, forceAbsolute } = {}) {
	// Resolve file path to an actual file and check if we're allowed
	// to load it, otherwise we throw. If we have permission we'll
	// continue.
	file = resolveFile(file, cwd, includeDirs);

	// Every file path sent to the client is relative to cwd.
	const relativeFile = normalizePath(path.relative(cwd, file));

	// Relative import specifiers must start with `./` or `../`. If the
	// resolved path doesn't begin with `../` then it was not resolved
	// outside of `cwd` and we can use `./` as a relative specifier.
	if (!importer && !relativeFile.startsWith('..')) {
		if (forceAbsolute) {
			return relativeFile.startsWith('/') ? relativeFile : '/' + relativeFile;
		}

		return './' + relativeFile;
	}

	// Check if the normalized path is relative to the importer file.
	// If it is, then we can keep the path relative to the importer and
	// let the browser deal with resolving it to the proper url path.
	if (importer) {
		importer = resolveFile(importer, cwd, includeDirs);

		// Check if `file` and `importer` resolve to the same include dir
		for (let dir of includeDirs) {
			const include = path.relative(dir, importer);
			if (!include.startsWith('..')) {
				// We found the include dir of importer. Check if it is the
				// same for our file.
				const relFile = path.relative(dir, file);
				if (!relFile.startsWith('..')) {
					// Both the importer and the file share the same include dir.
					// This means we can make our file relative to importer.
					const out = normalizePath(path.relative(path.dirname(importer), file));
					return !out.startsWith('..') ? './' + out : out;
				}
			}
		}
	}

	// The browser will remove any leading `../` segments, so we replace
	// those segments with `__/` to preserve them.
	return '/@path/' + relativeFile.replace(/\.\./g, '__');
}

/**
 * Deserialize import specifier for the server.
 * @param {string} file
 */
export function deserializeSpecifier(file) {
	if (!file.startsWith('/@path/')) {
		return path.posix.normalize(file);
	}

	file = file.slice('/@path/'.length).replace(/(^|\/)__\//g, '../');
	file = path.posix.normalize(file);
	return file.startsWith('..') ? file : './' + file;
}
