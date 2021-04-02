import { promises as fs } from 'fs';
import { basename } from 'path';

const PREFIX = 'my-url:';
const INTERNAL = '\0my-url:';

/** @type {import("wmr").Plugin} */
const MY_URL_PLUGIN = {
	name: 'my-url',
	async resolveId(id, importer) {
		if (!id.startsWith(PREFIX)) return;
		console.log('MY URL resolve', JSON.stringify(id));
		id = id.slice(PREFIX.length);

		const resolved = await this.resolve(id, importer, { skipSelf: true });

		return resolved && INTERNAL + resolved.id;
	},
	async load(id) {
		if (!id.startsWith(INTERNAL)) return;

		id = id.slice(INTERNAL.length);
		const fileId = this.emitFile({
			type: 'asset',
			name: basename(id),
			source: await fs.readFile(id)
		});

		return `export default import.meta.ROLLUP_FILE_URL_${fileId}`;
	}
};

export default function foo() {
	return {
		plugins: [MY_URL_PLUGIN]
	};
}
