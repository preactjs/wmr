import { transform, replace, optimize, commonjsToEsm, runtime } from 'escorn';

const CJS_KEYWORDS = /\b(module\.exports|exports)\b/;

export const ESM_KEYWORDS =
	/(\bimport\s*(\{.*?\}\s*from|\s[\w$]+\s+from)?\s*['"]|[\s;]export(\s+(default|const|var|let|function|class)[^\w$]|\s*\{))/;

/**
 * Attempt to convert CommonJS modules to ESM
 * @param {object} options
 * @param {boolean} options.production
 * @returns {import('rollup').Plugin}
 */
export function commonjsPlugin({ production }) {
	return {
		name: 'commonjs',
		async transform(code, id) {
			const hasCjsKeywords = CJS_KEYWORDS.test(code);
			const hasEsmKeywords = ESM_KEYWORDS.test(code);
			if (!hasCjsKeywords || hasEsmKeywords) return;

			const result = transform(code, {
				parse: this.parse,
				plugins: [
					replace({ 'process.env.NODE_ENV': 'development', __DEV__: !!production }),
					runtime({ runtime: 'browser' }),
					optimize(),
					commonjsToEsm()
				]
			});

			return {
				code: result.code,
				// FIXME: Sourcemap
				map: null
			};
		}
	};
}
