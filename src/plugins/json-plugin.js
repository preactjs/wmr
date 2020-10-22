/**
 * Convert JSON imports to ESM. Uses a prefix `\0json:./foo.json`.
 * In dev mode, this creates URLs like `/@json/path/to/foo.json`.
 *
 * @example
 *   import foo from './foo.json';
 *   import foo from 'json:./foo.json';
 *
 * @param {object?} [options]
 * @returns {import('rollup').Plugin}
 */
export default function jsonPlugin({} = {}) {
	const IMPORT_PREFIX = 'json:';
	const INTERNAL_PREFIX = '\0json:';

	return {
		name: 'json-plugin',
		async resolveId(id, importer) {
			if (id.startsWith(IMPORT_PREFIX)) {
				// always process prefixed imports
				id = id.slice(IMPORT_PREFIX.length);
			} else if (!id.endsWith('.json')) {
				// not a JSON file, no prefix
				return;
			}
			const resolved = await this.resolve(id, importer, { skipSelf: true });
			return resolved && INTERNAL_PREFIX + resolved.id;
		},
		transform(code, id) {
			if (!id.startsWith(INTERNAL_PREFIX)) return;

			return {
				code: `export default ${code}`,
				map: null
			};
		}
	};
}
