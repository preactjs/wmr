import { hasCustomPrefix } from '../lib/fs-utils.js';

/**
 * Load JSON files
 *
 * @example
 *   import foo from './foo.json';
 *   import foo from 'json:./foo.json';
 *
 * @param {object} options
 * @param {string} options.root
 * @returns {import('rollup').Plugin}
 */
export default function jsonPlugin({ root }) {
	const IMPORT_PREFIX = 'json:';

	return {
		name: 'json-plugin',
		async resolveId(id, importer) {
			if (id.startsWith(IMPORT_PREFIX)) {
				id = id.slice(IMPORT_PREFIX.length);
			}
			if (!id.endsWith('.json')) return;

			const resolved = await this.resolve(id, importer, { skipSelf: true });
			return resolved && resolved.id;
		},

		transform(code, id) {
			if (!id.endsWith('.json') || hasCustomPrefix(id)) return;

			return {
				code: `export default ${code}`,
				map: null
			};
		}
	};
}
