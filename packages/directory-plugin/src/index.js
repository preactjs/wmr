import { promises as fs } from 'fs';
import path from 'path';

const pathToPosix = p => p.split(path.sep).join(path.posix.sep);

/**
 * @param {object} [options]
 * @param {string} [options.cwd]
 * @returns {import('rollup').Plugin}
 */
function directoryPlugin({ cwd } = {}) {
  return {
    name: 'directory',
    async resolveId(id, importer) {
			if (!id.startsWith('dir:')) return;

      const resolved = await this.resolve(id.slice(4) + '\0', importer, { skipSelf: true });

      if (resolved) {
				return '\0dir:' + pathToPosix(resolved.id).replace(/\0$/, '');
			}
    },
    async load(id) {
      if (!id.startsWith('\0dir:')) return;

      // remove the "\dir:" prefix and convert to an absolute path:
      id = path.resolve(cwd || '.', id.slice(5));

      // watch the directory for changes:
      this.addWatchFile(id);

			// generate a module that exports the directory contents as an Array:
			const files = (await fs.readdir(id)).filter(d => d[0] != '.');

			return `export default ${JSON.stringify(files)}`;
    }
  };
}

export default directoryPlugin;
