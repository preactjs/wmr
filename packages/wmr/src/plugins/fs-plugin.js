import { promises as fs } from 'fs';
import * as kl from 'kolorist';
import { debug, formatPath } from '../lib/output-utils.js';

/**
 * Package.json "aliases" field: {"a":"b"}
 * @param {object} options
 * @param {Record<string,string>} [options.aliases] If omitted, obtained (and watched) from package.json
 * @param {string} options.cwd
 * @param {string} options.root
 * @returns {import('rollup').Plugin}
 */
export default function fsPlugin({ root, cwd }) {
	const log = debug('@fs');

	return {
		name: 'fs',
		async load(id) {
			if (id.startsWith('\0fs:')) {
				// TODO: Seems strange to have to add back
				// the absolute path here
				const file = '/' + id.slice('\0fs:'.length);
				// TODO: Allowlist of folders from which
				// to include files from
				// TODO: Windows
				// fs.readFile()
				log(kl.dim(`load `) + kl.cyan(formatPath(file, root)));
				const code = await fs.readFile(file, 'utf-8');

				return {
					code,
					map: null
				};
			}
		}
	};
}
