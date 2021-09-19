import { promises as fs } from 'fs';
import path from 'path';
import * as kl from 'kolorist';
import { isFile } from '../../lib/fs-utils.js';
import { debug } from '../../lib/output-utils.js';
import { npmBundle } from './npm-bundle.js';
import { Deferred, escapeFilename, getPackageInfo, isValidPackageName } from './utils.js';

const log = debug('npm', 196);

/**
 * @param {object} options
 * @param {string} options.cwd
 * @param {boolean} options.autoInstall
 * @param {boolean} options.production
 * @returns {import('rollup').Plugin}
 */
export function npmPlugin2({ cwd, autoInstall, production }) {
	const PREFIX = '\0npm:';

	const cacheDir = path.join(cwd, '.cache', '@npm');

	// FIXME: Buffer for assets
	/** @type {Map<string, { code: string, map: any }>} */
	const chunkCache = new Map();

	const entryToChunk = new Map();

	/** @type {Map<string, import('./utils').Deferred>} */
	const pending = new Map();

	return {
		name: 'npm-plugin-2',
		async resolveId(id) {
			if (!isValidPackageName(id)) return;
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
			// FIXME: assets
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

			deferred = new Deferred();
			pending.set(id, deferred);

			log(kl.dim(`bundle: `) + kl.cyan(id));
			let result = await npmBundle(id, { autoInstall, production, cacheDir, cwd });

			await Promise.all(
				result.output.map(async chunkOrAsset => {
					// FIXME: assets
					if (chunkOrAsset.type === 'chunk') {
						const { isEntry, fileName, code, map } = chunkOrAsset;
						if (isEntry) {
							entryToChunk.set(id, fileName);
						}

						const hasExt = path.extname(fileName);
						const diskCachePath = path.join(diskCacheDir, hasExt ? fileName : fileName + '.js');
						await fs.mkdir(path.dirname(diskCachePath), { recursive: true });
						await fs.writeFile(diskCachePath, code);

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

			return {
				code: chunk.code,
				map: chunk.map
			};
		}
	};
}
