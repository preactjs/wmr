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
		watchedFiles = glob(watchedFiles, {
			filesOnly: true,
			cwd
		}).catch(err => {
			throw Error(`Failed to create file watcher:\n${err.message}`);
		});
		// suppress async rejection warning:
		watchedFiles.catch(() => {});
	}

	return {
		name: 'watcher-plugin',
		async buildStart() {
			watchedFiles = await watchedFiles;
			// each time a build starts, re-register the files:
			if (watchedFiles) {
				for (const f of watchedFiles) {
					this.addWatchFile(f);
				}
				// watchedFiles = null;
			}
		},
		watchChange(id) {
			// console.log('watchChange', id);
			const filename = '/' + relative(cwd, id.replace(/\.save\..*$/g, ''));
			if (onChange) onChange(filename);
		}
	};
}
