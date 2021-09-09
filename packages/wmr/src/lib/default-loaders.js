import { IMPLICIT_URL } from '../plugins/url-plugin.js';
import { hasCustomPrefix } from './fs-utils.js';
import { transformImports } from './transform-imports.js';

/**
 * Add default loaders to import specifiers if none are
 * present already.
 * @param {{ matchStyles: boolean }} options
 * @returns {import("wmr").Plugin}
 */
export function defaultLoaders({ matchStyles }) {
	return {
		name: 'default-loaders',
		async transform(code, id) {
			if (!/\.([tj]sx?|mjs)$/.test(id)) return;

			return await transformImports(code, id, {
				resolveId(specifier) {
					if (
						!hasCustomPrefix(specifier) &&
						(IMPLICIT_URL.test(specifier) || (matchStyles && /\.([sa]?css|less)$/.test(specifier)))
					) {
						return `url:${specifier}`;
					}
					return null;
				}
			});
		}
	};
}
