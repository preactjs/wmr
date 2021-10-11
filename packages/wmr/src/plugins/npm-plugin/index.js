import { promises as fs } from 'fs';
import path from 'path';
import * as kl from 'kolorist';
import { isFile, writeFile } from '../../lib/fs-utils.js';
import { debug } from '../../lib/output-utils.js';
import { npmBundle } from './npm-bundle.js';
import { Deferred, escapeFilename, findInstalledPackage, getPackageInfo, isValidPackageName } from './utils.js';

const log = debug('npm', 196);

/**
 * @param {object} options
 * @param {string} options.cwd
 * @param {boolean} options.autoInstall
 * @param {boolean} options.production
 * @param {string} options.registryUrl
 * @param {string} options.cacheDir
 * @param {Record<string, string>} options.alias
 * @param {Map<string, string>} options.resolutionCache
 * @returns {import('rollup').Plugin}
 */
export function npmPlugin({ cwd, cacheDir, autoInstall, production, registryUrl, resolutionCache, alias }) {
	const PREFIX = '\0npm:';

	/** @type {Map<string, { code: string, map: any }>} */
	const chunkCache = new Map();

	/** @type {Map<string, string>} */
	const entryToChunk = new Map();

	/** @type {Map<string, import('./utils').Deferred>} */
	const pending = new Map();

	const assetDeferredId = '::asset';

	/**
	 * Bundle an npm package and update build caches
	 * @param {string} id
	 * @param {object} options
	 * @param {string} options.packageName
	 * @param {string} options.diskCacheDir
	 * @param {Record<string, string>} options.alias
	 * @param {Map<string, string>} options.resolutionCache
	 * @returns {Promise<{ code: string, map: any }>}
	 */
	async function bundleNpmPackage(id, { packageName, diskCacheDir, resolutionCache, alias }) {
		const deferred = new Deferred();
		pending.set(id, deferred);

		// Also add package name itself so that assets can wait on it
		let assetDeferred;
		if (id !== packageName) {
			assetDeferred = new Deferred();
			pending.set(packageName + assetDeferredId, assetDeferred);
		}

		log(kl.dim(`bundle: `) + kl.cyan(id));
		let result = await npmBundle(id, { autoInstall, production, cacheDir, cwd, resolutionCache, registryUrl, alias });

		await Promise.all(
			result.output.map(async chunkOrAsset => {
				if (chunkOrAsset.type === 'chunk') {
					let { isEntry, fileName, code, map } = chunkOrAsset;
					if (isEntry) {
						entryToChunk.set(id, fileName);
					}

					const hasExt = path.extname(fileName);
					const diskCachePath = path.join(diskCacheDir, hasExt ? fileName : fileName + '.js');
					await writeFile(diskCachePath, code);

					chunkCache.set(fileName, { code, map: map || null });
				}
			})
		);

		const entryReq = entryToChunk.get(id);
		let chunkId = entryReq ? entryReq : id;

		const chunk = chunkCache.get(chunkId);
		if (!chunk) {
			throw new Error(`Compiled chunk for package "${chunkId}" not found.`);
		}

		deferred.resolve(chunk);
		if (assetDeferred) {
			assetDeferred.resolve(chunk);
		}

		return chunk;
	}

	return {
		name: 'npm-plugin',
		async resolveId(id) {
			// console.log('NPM', id);
			if (id.startsWith(PREFIX)) {
				id = id.slice(PREFIX.length);
			}
			if (!isValidPackageName(id)) return;

			// Assets require special handling as other plugins need to deal with
			// non-js files during their `load()` method. To work around this
			// limitation in rollup's plugin system we'll pretend that we'd requested
			// the bare package instead of the asset and bundle that during the
			// resolution step. When that's done we can ensure that the file
			// exists on disk and can resolve to that. That way the "style" plugin
			// can load it like usual in their `load()` method.
			const { name, pathname } = getPackageInfo(id);
			const isAsset = pathname && !/\.[tj]sx?$/.test(path.basename(pathname)) && path.extname(pathname) !== '';

			if (isAsset) {
				let deferred = pending.get(name + assetDeferredId);
				log(kl.dim(`asset ${id}, wait for bundling `) + kl.cyan(name));
				const diskCacheDir = path.join(cacheDir, escapeFilename(name));
				if (!deferred) {
					await bundleNpmPackage(name, { packageName: name, diskCacheDir, resolutionCache, alias });
				} else {
					await deferred;
				}

				// Check if the package is local
				const modDir = resolutionCache.get(name) || (await findInstalledPackage(cwd, name));
				if (modDir) {
					const resolved = path.join(modDir, pathname);
					log(kl.dim(`asset found locally at `) + kl.cyan(resolved));
					return {
						id: PREFIX + id,
						meta: {
							npmActualPath: resolved
						}
					};
				}

				// Check bundle cache in case the package was auto-installed
				const cachePath = path.join(cacheDir, pathname);
				if (await isFile(cachePath)) {
					return {
						id: PREFIX + id,
						meta: {
							npmActualPath: cachePath
						}
					};
				}

				// throw new Error(`Could not resolve asset ${id}`);
			}

			return PREFIX + id;
		},
		async load(id) {
			if (!id.startsWith(PREFIX)) return;
			id = id.slice(PREFIX.length);

			// Return from cache if possible
			const cached = chunkCache.get(id);
			if (cached) {
				log(kl.dim(`load: `) + kl.cyan(id) + ` [memory]`);
				return cached;
			}

			// Check disk cache next
			const meta = getPackageInfo(id);
			const diskCacheDir = path.join(cacheDir, escapeFilename(meta.name));
			const basename = meta.pathname
				? path.extname(meta.pathname)
					? meta.pathname
					: meta.pathname + '.js'
				: path.basename(id) + '.js';

			const diskPath = path.join(diskCacheDir, basename);
			if (await isFile(diskPath)) {
				log(kl.dim(`load: `) + kl.cyan(id) + ` [disk]`);
				return await fs.readFile(diskPath, 'utf-8');
			}

			// Prevent duplicate bundling requeusts
			let deferred = pending.get(id);
			if (deferred) {
				return deferred.promise;
			}

			const chunk = await bundleNpmPackage(id, { packageName: meta.name, diskCacheDir, resolutionCache, alias });

			return {
				code: chunk.code,
				map: chunk.map
			};
		}
	};
}
