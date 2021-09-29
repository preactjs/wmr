import { findInstalledPackage, getPackageInfo, isValidPackageName } from './utils.js';

/**
 * Resolve an npm package from disk
 * @param {object} options
 * @param {string} options.root
 * @returns {import('rollup').Plugin}
 */
export function npmLocalPackage({ root }) {
	return {
		name: 'npm-local',
		async resolveId(id) {
			if (!isValidPackageName(id)) return;

			const info = getPackageInfo(id);

			const modDir = await findInstalledPackage(root, info.name);
			if (modDir) {
				return {
					id,
					meta: { wmr: { modDir } }
				};
			}
		}
	};
}
