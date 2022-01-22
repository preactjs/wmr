import path from 'path';
import { isValidPackageName } from './utils.js';

/**
 * @param {object} options
 * @param {Map<string, string>} options.browserReplacement
 * @returns {import('rollup').Plugin}
 */
export function browserFieldPlugin({ browserReplacement }) {
	return {
		name: 'browser-field',
		async resolveId(id, importer) {
			let spec = path.posix.normalize(id);
			const replace = browserReplacement.get(spec);
			if (replace) {
				if (importer && isValidPackageName(importer)) {
					const info = this.getModuleInfo(importer);
					importer = path.join(info?.meta.wmr.modDir, importer);
				}
				return this.resolve(replace, importer, { skipSelf: true });
			}
		}
	};
}
