import { promises as fs } from 'fs';

const PREFIX = 'my-json:';
const INTERNAL = '\0my-json:';

/** @type {import("wmr").Plugin} */
const MY_JSON_PLUGIN = {
	name: 'my-json',
	async resolveId(id, importer) {
		if (id.startsWith(PREFIX)) {
			id = id.slice(PREFIX.length);
			const resolved = await this.resolve(id, importer, { skipSelf: true });
			return resolved && INTERNAL + resolved.id;
		}
	},
	async load(id) {
		if (!id.startsWith(INTERNAL)) return;

		id = id.slice(INTERNAL.length);
		const content = await fs.readFile(id, 'utf-8');
		return `export default ${content}`;
	}
};

export default function foo() {
	return {
		plugins: [MY_JSON_PLUGIN]
	};
}
