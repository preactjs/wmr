import path from 'path';
import { promises as fs } from 'fs';
import { isDirectory } from '../../lib/fs-utils.js';

/**
 * Legacy way of defining package entry points before the
 * "export" field in `package.json` was a thing.
 * @returns {import('rollup').Plugin}
 */
export function subPackageLegacy() {
	return {
		name: 'legacy-sub-package',
		async resolveId(id, importer) {
			if (!path.isAbsolute(id) || !(await isDirectory(id))) return;

			try {
				const subFile = path.join(id, 'package.json');
				const pkg = JSON.parse(await fs.readFile(subFile, 'utf-8'));

				const nextId = path.join(id, pkg.module || pkg.main);

				const resolved = await this.resolve(nextId, importer, { skipSelf: true });

				return {
					id: resolved ? resolved.id : nextId,
					external: true
				};
			} catch (err) {}
		}
	};
}
