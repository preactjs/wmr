import { debug } from '../../lib/output-utils.js';
import { PACKAGE_SPECIFIER } from './index.js';
import { promises as fs } from 'fs';
import path from 'path';
import * as kl from 'kolorist';
import { isFile } from '../../lib/fs-utils.js';

/**
 * @param {object} options
 * @param {string} options.cwd
 * @returns {import('rollup').Plugin}
 */
export function npmPluginV2({ cwd }) {
	const log = debug('npm-plugin-v2');

	const cacheDir = path.join(cwd, '.cache', '@npm');

	return {
		name: 'npm-plugin-v2',
		async load(id) {
			if (/^\.\.?/.test(id)) return;

			const match = id.match(PACKAGE_SPECIFIER);
			if (!match) return;

			let [, name = '', version = 'latest', pathname = ''] = match;

			// Support for windows paths
			const moduleDirname = name.startsWith('@') ? name.replace(/\//g, path.sep) : name;

			// Check if it's already in the cache
			let cacheFile = path.join(cacheDir, `${moduleDirname}@${version}`, pathname);

			// Add default extension if none is present.
			if (!path.extname(cacheFile)) {
				cacheFile += '.js';
			}

			if (await isFile(cacheFile)) {
				log(`${kl.cyan(id)} -> ${kl.dim(cacheFile)} [cached]`);
				return fs.readFile(cacheFile, 'utf-8');
			}

			const moduleDir = await findModuleDir(cwd, moduleDirname);
			if (!moduleDir) return;

			// We've found
			console.log(match);
			console.log(JSON.stringify(id), JSON.stringify(name), moduleDir);
		}
	};
}

/**
 * Implement node's resolution algorithm according to https://nodejs.org/api/modules.html#modules_loading_from_node_modules_folders
 * @param {string} startDir The directory to start the search from
 * @param {string} moduleName
 * @returns {Promise<string | null>}
 */
async function findModuleDir(startDir, moduleName) {
	const dir = path.join(startDir, 'node_modules', moduleName);

	try {
		const stats = await fs.stat(dir);
		if (stats.isDirectory()) {
			return dir;
		}

		const next = path.dirname(dir);

		// Check if we've already reached the topmost directory
		if (next === startDir) return null;

		return findModuleDir(next, moduleName);
	} catch (err) {
		return null;
	}
}
