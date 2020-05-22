import { promises as fs } from 'fs';
import { basename } from 'path';

/**
 * @returns {import('rollup').Plugin}
 */
export default function wmrStylesPlugin() {
	return {
		name: 'liveStylesPlugin',
		async load(id) {
			if (id.match(/\.css$/)) {
				const ref = this.emitFile({
					type: 'asset',
					name: basename(id),
					source: await fs.readFile(id)
				});
				return `
					import { style } from 'wmr';
					style(import.meta.ROLLUP_FILE_URL_${ref});
				`;
			}
		}
	};
}
