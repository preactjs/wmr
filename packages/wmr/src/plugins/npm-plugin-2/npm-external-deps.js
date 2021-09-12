import { isValidPackageName } from './utils.js';

/**
 * Detect if an id is an npm package and mark it as external
 * @param {object} options
 * @param {string} options.requestId
 * @returns {import('rollup').Plugin}
 */
export function npmExternalDeps({ requestId }) {
	return {
		name: 'npm-detect',
		async resolveId(id) {
			if (!isValidPackageName(id)) return;

			if (id !== requestId) {
				return {
					id,
					external: true
				};
			}
		}
	};
}
