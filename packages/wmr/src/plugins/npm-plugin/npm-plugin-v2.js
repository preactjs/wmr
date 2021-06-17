import { promises as fs } from 'fs';
import * as kl from 'kolorist';
import path from 'path';
import * as rollup from 'rollup';
import { isFile, readJSON } from '../../lib/fs-utils.js';
import { debug } from '../../lib/output-utils.js';
import { PACKAGE_SPECIFIER } from './index.js';

/**
 * @param {object} options
 * @param {string} options.cwd
 * @returns {import('rollup').Plugin}
 */
export function npmPluginV2({ cwd }) {
	const log = debug('npm-plugin-v2');

	const cacheDir = path.join(cwd, '.cache', '@npm');

	/** @type {string[]} */
	let external = [];
	/** @type {null | Record<string, any>} */
	let projectPkgJson = null;

	return {
		name: 'npm-plugin-v2',
		async load(id) {
			if (/^\.\.?/.test(id)) return;

			const match = id.match(PACKAGE_SPECIFIER);
			if (!match) return;

			// Lazy-load project's package.json. This is only done once.
			if (!projectPkgJson) {
				const pkgJsonFile = await findPackageJson(cwd);
				if (!pkgJsonFile) {
					throw new Error('Unable to find package.json file');
				}

				projectPkgJson = JSON.parse(await fs.readFile(pkgJsonFile, 'utf-8'));
				external = [
					...Object.keys(projectPkgJson.dependencies || {}),
					...Object.keys(projectPkgJson.peerDependencies || {})
				];
			}

			let [, name = '', version = 'latest', pathname = ''] = match;

			// Support for windows paths
			const moduleDirname = name.startsWith('@') ? name.replace(/\//g, path.sep) : name;

			// Check if it's already in the cache
			// TODO: When do we invalidate this?
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

			// TODO: Pathname resolution (package exports + deep imports)
			const pkg = await readJSON(path.join(moduleDir, 'package.json'));
			const file = '';

			console.log(match);
			console.log(JSON.stringify(id), JSON.stringify(name), moduleDir);

			// Check if we're dealing with js code or asset files like `.css`
			if (/\.[cm]?js$/.test(file)) {
				const start = Date.now();
				const bundle = await rollup.rollup({
					external
				});

				const result = await bundle.write({
					format: 'esm',
					exports: 'auto'
				});

				log(kl.cyan(id) + kl.dim(' pre-bundled in ') + kl.lightMagenta(`+${Date.now() - start}ms`));
				// TODO: Store result in cache
			} else {
				// Copy assets like `.css` or `.woff`.
				await fs.copyFile(file, cacheFile);
			}

			// Read final result from cache
			return await fs.readFile(cacheFile, 'utf-8');
		}
	};
}

/**
 * Find the closest `package.json` file. Not that there is no relation
 * between the `node_modules` folder and the location of `package.json`.
 * @param {string} startDir The directory to start the search from
 * @returns {Promise<string | null>}
 */
async function findPackageJson(startDir) {
	const file = path.join(startDir, 'package.json');

	try {
		const stats = await fs.stat(file);
		if (stats.isFile()) {
			return file;
		}

		const next = path.dirname(startDir);

		// Check if we've already reached the topmost directory
		if (next === startDir) return null;

		return findPackageJson(next);
	} catch (err) {
		return null;
	}
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

		const next = path.dirname(startDir);

		// Check if we've already reached the topmost directory
		if (next === startDir) return null;

		return findModuleDir(next, moduleName);
	} catch (err) {
		return null;
	}
}
