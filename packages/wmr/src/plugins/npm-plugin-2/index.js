import { debug } from '../../lib/output-utils.js';
import { npmBundle } from './npm-bundle.js';
import { isValidPackageName } from './utils.js';

const log = debug('npm-plugin-2');

/**
 * @param {object} options
 * @param {string} options.root
 * @returns {import('rollup').Plugin}
 */
export function npmPlugin2({ root }) {
	const PREFIX = '\0npm:';

	// FIXME: Buffer for assets
	/** @type {Map<string, { code: string, map: any }>} */
	const chunkCache = new Map();

	return {
		name: 'npm-plugin-2',
		async resolveId(id, importer) {
			if (!isValidPackageName(id)) return;
			return PREFIX + id;
		},
		async load(id) {
			if (!id.startsWith(PREFIX)) return;
			id = id.slice(PREFIX.length);

			// TODO: Caching

			let result = await npmBundle(root, id);

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

			log(result);
			log(chunkCache);

			const chunk = chunkCache.get(id);
			if (!chunk) {
				throw new Error(`Compiled chunk for package "${name}" not found.`);
			}

			return {
				code: chunk.code,
				map: chunk.map
			};
		}
	};
}
