import path from 'path';
import { isFile } from '../lib/fs-utils.js';

/**
 * Resolve extensionless or directory specifiers by looking them up on the disk.
 * @param {object} options
 * @param {string[]} options.extensions File extensions/suffixes to check for
 * @param {string} options.root
 * @returns {import('rollup').Plugin}
 */
export default function resolveExtensionsPlugin({ root, extensions }) {
	extensions = extensions.concat(extensions.map(e => `/index${e}`));

	return {
		name: 'resolve-extensions-plugin',
		async resolveId(id, importer) {
			if (!/^\.\.?\//.test(id) || path.posix.extname(id) !== '') return;

			for (let i = 0; i < extensions.length; i++) {
				const ext = extensions[i];
				let file = path.resolve(root, id + ext);

				if (await isFile(file)) {
					const resolved = await this.resolve(file, importer, { skipSelf: true });
					return resolved || file;
				}
			}
		}
	};
}
