import { isValidPackageName } from './utils.js';
import { debug } from '../../lib/output-utils.js';

const log = debug('npm-auto-install');

/**
 * @returns {import('rollup').Plugin}
 */
export function npmAutoInstall() {
	return {
		name: 'npm-auto-install',
		resolveId(id) {
			if (!isValidPackageName(id)) return;

			log(`installing... ${id}`);
		}
	};
}
