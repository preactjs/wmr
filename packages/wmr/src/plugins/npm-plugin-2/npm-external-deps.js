import { isValidPackageName, getPackageInfo } from './utils.js';

/**
 * Detect if an id is an npm package and mark it as external
 * @param {object} options
 * @param {string} options.pkgName
 * @returns {import('rollup').Plugin}
 */
export function npmExternalDeps({ pkgName }) {
	return {
		name: 'npm-detect',
		async resolveId(id, importer) {
			if (!isValidPackageName(id)) return;

			const { name } = getPackageInfo(id);
			if (name !== pkgName) {
				return {
					id,
					external: true
				};
			}

			// return await this.resolve(id, importer, { skipSelf: true });
		}
	};
}
