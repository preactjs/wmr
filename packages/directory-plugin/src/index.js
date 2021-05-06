import { promises as fs } from 'fs';
import path from 'path';

/**
 * @returns {import('wmr').Plugin}
 */
export default function directoryPlugin() {
	const PREFIX = 'dir:';
	const INTERNAL = '\0dir:';

	/** @type {import("wmr").Options} */
	let options;

	return {
		name: 'directory',
		configResolved(config) {
			options = config;
		},
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
	};
}
