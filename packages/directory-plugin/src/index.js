import { promises as fs } from 'fs';
import path from 'path';

/**
 * @param {import("wmr").Options} options
 * @param {string} options.cwd
 * @returns {import('rollup').Plugin}
 */
function directoryPlugin(options) {
	const PREFIX = 'dir:';
	const INTERNAL = '\0dir:';

	options.plugins.push({
		name: 'directory',
		async resolveId(id, importer) {
			if (!id.startsWith(PREFIX)) return;

			id = id.slice(PREFIX.length);
			const resolved = await this.resolve(id, importer, { skipSelf: true });
			return INTERNAL + (resolved ? resolved.id : id);
		},
		async load(id) {
			if (!id.startsWith(INTERNAL)) return;

			// remove the "\dir:" prefix and convert to an absolute path:
			id = id.slice(INTERNAL.length);
			let dir = id.split(path.posix.sep).join(path.sep);
			if (!path.isAbsolute(dir)) {
				dir = path.join(options.cwd, dir);
			}

			const stats = await fs.stat(dir);
			if (!stats.isDirectory()) throw Error(`Not a directory.`);

			// watch the directory for changes:
			this.addWatchFile(dir);

			// generate a module that exports the directory contents as an Array:
			const files = (await fs.readdir(dir)).filter(d => d[0] != '.');
			return `export default ${JSON.stringify(files)}`;
		}
	});
}

export default directoryPlugin;
