import { IMPLICIT_URL } from '../plugins/url-plugin.js';
import { transformImports } from './transform-imports.js';

/**
 * Add default loaders to import specifiers if none are
 * present already.
 * @returns {import("wmr").Plugin}
 */
export function defaultLoaders() {
	return {
		name: 'default-loaders',
		async transform(code, id) {
			if (!/\.([tj]sx?|mjs)$/.test(id)) return;

			return await transformImports(code, id, {
				resolveId(specifier) {
					const hasPrefix = /^[-\w]+:/.test(specifier);

					if (!hasPrefix) {
						if (IMPLICIT_URL.test(specifier)) {
							return `url:${specifier}`;
						}
					}
					return null;
				}
			});
		}
	};
}
