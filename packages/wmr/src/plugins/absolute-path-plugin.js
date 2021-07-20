import path from 'path';
import { isFile } from '../lib/fs-utils.js';

/**
 * Resolve all import specifiers starting with a `/` against
 * the defined root.
 * @param {object} options
 * @param {string} options.root
 * @returns {import('rollup').Plugin}
 */
export function absolutePathPlugin({ root }) {
	return {
		name: 'absolute-path',
		async resolveId(id) {
			if (id.startsWith('/')) {
				const file = path.join(root, id.split(path.posix.sep).join(path.sep));
				if (await isFile(file)) {
					return file;
				}
			}
		}
	};
}
