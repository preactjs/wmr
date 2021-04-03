import { promises as fs } from 'fs';
import { resolveFile } from '../lib/plugins.js';

/**
 * Convert JSON imports to ESM. Uses a prefix `\0json:./foo.json`.
 * In dev mode, this creates URLs like `/@json/path/to/foo.json`.
 *
 * @example
 *   import foo from './foo.json';
 *   import foo from 'json:./foo.json';
 *
 * @param {object} options
 * @param {string} options.cwd
 * @returns {import('rollup').Plugin}
 */
export default function jsonPlugin({ cwd }) {
	const IMPORT_PREFIX = 'json:';
	const INTERNAL_PREFIX = '\0json:';

	return {
		name: 'json-plugin',
		async resolveId(id, importer) {
			if (!id.startsWith(IMPORT_PREFIX)) return;

			id = id.slice(IMPORT_PREFIX.length);

			const resolved = await this.resolve(id, importer, { skipSelf: true });
			return resolved && INTERNAL_PREFIX + resolved.id;
		},
		// TODO: If we find a way to remove the need for adding
		// an internal prefix we can get rid of the whole
		// loading logic here and let rollup handle that part.
		async load(id) {
			if (!id.startsWith(INTERNAL_PREFIX)) return null;

			id = id.slice(INTERNAL_PREFIX.length);

			// Check that we're allowed to load this file
			const file = await resolveFile(id, [cwd]);
			return await fs.readFile(file, 'utf-8');
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
