import path from 'path';
import { isDirectory, isFile } from '../lib/fs-utils.js';
import { debug, formatPath } from '../lib/output-utils.js';
import * as kl from 'kolorist';

const log = debug('html-resolve');

/**
 * Resolve html files
 * @param {{ root: string }} options
 * @returns {import('rollup').Plugin}
 */
export function htmlResolvePlugin({ root }) {
	return {
		name: 'html-resolve',
		async resolveId(id) {
			const extname = path.posix.extname(id);
			if ((extname !== 'html' && extname !== '') || !/^\.\//.test(id)) {
				return;
			}

			let fileOrDir = path.join(root, id.split(path.win32.sep).join(path.sep));

			if (extname === 'html') {
				if (await isFile(fileOrDir)) {
					return id;
				}

				throw new Error(`missing "index.html" file`);
			} else if (id === './') {
				log(`${kl.cyan(formatPath(id))} -> ${kl.dim('index.html')} [fallback]`);
				return path.join(root, 'index.html');
			} else if ((await isDirectory(fileOrDir)) || (fileOrDir = root)) {
				const path200 = path.join(fileOrDir, '200.html');
				if (await isFile(path200)) {
					return path200;
				}

				const pathIndex = path.join(fileOrDir, 'index.html');
				if (await isFile(pathIndex)) {
					return pathIndex;
				}
			}
		}
	};
}
