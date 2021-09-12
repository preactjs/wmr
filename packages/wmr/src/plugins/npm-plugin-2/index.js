import { npmBundle } from './npm-bundle.js';
import { isValidPackageName } from './utils.js';

/**
 * @param {object} options
 * @param {string} options.root
 * @param {boolean} options.autoInstall
 * @returns {import('rollup').Plugin}
 */
export function npmPlugin2({ root, autoInstall }) {
	const PREFIX = '\0npm:';

	// FIXME: Buffer for assets
	/** @type {Map<string, { code: string, map: any }>} */
	const chunkCache = new Map();

	return {
		name: 'npm-plugin-2',
		async resolveId(id) {
			if (!isValidPackageName(id)) return;
			return PREFIX + id;
		},
		async load(id) {
			if (!id.startsWith(PREFIX)) return;
			id = id.slice(PREFIX.length);

			// TODO: Caching

			let result = await npmBundle(root, id, { autoInstall });

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

			return {
				code: chunk.code,
				map: chunk.map
			};
		}
	};
}
