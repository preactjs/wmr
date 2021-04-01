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
		async resolveId(id, importer, options) {
			console.log('JSON opts', options);
			console.trace();
			const originalId = options.custom ? options.custom.originalId : null;

			console.log('ORG', originalId, id, !originalId && id.endsWith('.json'), originalId && !/^[-\w]+:/.test(id));
			if ((!originalId && id.endsWith('.json')) || (originalId && !/^[-\w]+:/.test(originalId))) {
				id = IMPORT_PREFIX + id;
			}
			// Only resolve if prefix is present or NO prefix at all
			if (!id.startsWith(IMPORT_PREFIX)) return;
			console.log('GOGOGO', JSON.stringify(id), JSON.stringify(importer));
			id = id.slice(IMPORT_PREFIX.length);

			const resolved = await this.resolve(id, importer, { skipSelf: true, custom: { originalId: id } });
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
