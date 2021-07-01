import path from 'path';
import { isDirectory, isFile } from '../lib/fs-utils.js';
import { debug } from '../lib/output-utils.js';
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

			const fileOrDir = path.join(root, id.split(path.win32.sep).join(path.sep));

			if (extname === 'html') {
				if (await isFile(fileOrDir)) {
					return id;
				}
			} else if (await isDirectory(fileOrDir)) {
				const path200 = path.join(fileOrDir, '200.html');
				if (await isFile(path200)) {
					return path200;
				}

				const pathIndex = path.join(fileOrDir, 'index.html');
				if (await isFile(pathIndex)) {
					return pathIndex;
				}
			} else {
				log(kl.dim(`Falling back to `) + kl.cyan('index.html'));
				return path.join(root, 'index.html');
			}
		}
	};
}
