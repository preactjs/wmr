import { transformCss } from '../../../lib/transform-css.js';

/**
 * @param {string} sass
 * @returns {string} css
 */
export function processSass(sass) {
	return transformCss(sass);
}
