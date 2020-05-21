import { relative } from 'path';

/**
 * 
 * @param {object} [options]
 * @param {string} [options.cwd]
 * @param {string[] | Promise<string[]>} [options.watchedFiles]
 * @param {(filename: string) => void} [options.onChange]
 * @returns {import('rollup').Plugin}
 */
export default function watcherPlugin({ cwd = '.', watchedFiles, onChange } = {}) {
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
