import { npmBundle } from './npm-bundle.js';
import { Deferred, isValidPackageName } from './utils.js';

/**
 * @param {object} options
 * @param {string} options.cwd
 * @param {boolean} options.autoInstall
 * @param {boolean} options.production
 * @returns {import('rollup').Plugin}
 */
export function npmPlugin2({ cwd, autoInstall, production }) {
	const PREFIX = '\0npm:';

	// FIXME: Buffer for assets
	/** @type {Map<string, { code: string, map: any }>} */
	const chunkCache = new Map();

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
				return cached;
			}

			// Prevent duplicate bundling requeusts
			let deferred = pending.get(id);
			if (deferred) {
				return deferred.promise;
			}

			deferred = new Deferred();
			pending.set(id, deferred);

			let result = await npmBundle(cwd, id, { autoInstall, production });

			result.output.forEach(chunkOrAsset => {
				if (chunkOrAsset.fileName === 'virtual-entry.js') {
					return;
				}

				// FIXME: assets
				if (chunkOrAsset.type === 'chunk') {
					if (!chunkOrAsset.facadeModuleId) {
						throw new Error(`Missing facadeModuleId for "${id}"`);
					}
					chunkCache.set(chunkOrAsset.facadeModuleId, { code: chunkOrAsset.code, map: chunkOrAsset.map || null });
				}
			});

			const chunk = chunkCache.get(id);
			if (!chunk) {
				throw new Error(`Compiled chunk for package "${id}" not found.`);
			}

			deferred.resolve(chunk);

			return {
				code: chunk.code,
				map: chunk.map
			};
		}
	};
}