import { promises as fs } from 'fs';
/**
 * Convert JSON imports to ESM. Uses a prefix `\0json:./foo.json`.
 * In dev mode, this creates URLs like `/@json/path/to/foo.json`.
 *
 * @example
 *   import foo from './foo.json';
 *   import foo from 'json:./foo.json';
 *
 * @returns {import('rollup').Plugin}
 */
export default function jsonPlugin() {
	const IMPORT_PREFIX = 'json:';

	return {
		name: 'json-plugin',
		async resolveId(id, importer) {
			if (id.endsWith('.json') && !/^[-\w]+:/.test(id)) {
				id = IMPORT_PREFIX + id;
			}
			// Only resolve if prefix is present or NO prefix at all
			console.log(JSON.stringify(id), JSON.stringify(importer));
			if (!id.startsWith(IMPORT_PREFIX)) return;
			id = id.slice(IMPORT_PREFIX.length);

			const resolved = await this.resolve(id, importer, { skipSelf: true, custom: { foo: 123 } });
			return resolved && IMPORT_PREFIX + resolved.id;
		},
		async load(id) {
			if (!id.startsWith(IMPORT_PREFIX)) return;

			id = id.slice(IMPORT_PREFIX.length);
			const content = await fs.readFile(id, 'utf-8');
			return `export default ${content}`;
		}
	};
}
