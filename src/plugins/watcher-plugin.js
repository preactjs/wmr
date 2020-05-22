import { relative } from 'path';
import glob from 'tiny-glob';

/**
 * Watches files and calls a function when they change.
 * @param {object} [options]
 * @param {string} [options.cwd]
 * @param {string | string[] | Promise<string[]>} [options.watchedFiles] A glob pattern, or Array of files, or a Promise that resolves to an Array of files.
 * @param {(filename: string) => void} [options.onChange]
 * @returns {import('rollup').Plugin}
 */
export default function watcherPlugin({ cwd = '.', watchedFiles, onChange } = {}) {
	if (typeof watchedFiles === 'string') {
		if (cwd && cwd !== '.') {
			watchedFiles = cwd + '/' + watchedFiles;
		}
		watchedFiles = glob(watchedFiles, { filesOnly: true });
	}

	return {
		name: 'watcher-plugin',
		async buildStart() {
			if (watchedFiles) {
				for (const f of await watchedFiles) {
					this.addWatchFile(f);
				}
				watchedFiles = null;
			}
		},
		watchChange(id) {
			const filename = '/' + relative(cwd, id.replace(/\.save\..*$/g, ''));
			onChange(filename);
		}
	};
}
