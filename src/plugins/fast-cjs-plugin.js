const CJS_KEYWORDS = /\b(module\.exports|exports)\b/;

const ESM_KEYWORDS = /(\bimport\s*(\{|\s['"\w_$])|[\s;]export(\s+(default|const|var|let)[^\w$]|\s*\{))/;

/**
 * Extremely loose (but fast) conversion from CJS to ESM
 * @param {object} [options]
 * @param {RegExp | ((filename: string) => boolean)} [options.include] Controls which files are processed.
 * @param {string[]} [options.extensions=['.js','.cjs']] Only process CJS in files with these extensions
 * @returns {import('rollup').Plugin}
 */
export default function fastCjsPlugin({ include, extensions = ['.js', '.cjs'] } = {}) {
	return {
		name: 'fast-cjs',
		transform(code, id) {
			if (!extensions.some(ext => id.endsWith(ext))) return;

			if (include) {
				const shouldTransform = typeof include === 'function' ? include(id) : id.match(include);
				if (!shouldTransform) return;
			}

			const hasCjsKeywords = CJS_KEYWORDS.test(code);
			const hasEsmKeywords = ESM_KEYWORDS.test(code);
			if (!hasCjsKeywords || hasEsmKeywords) return;

			code = `var module={exports:{}},exports=module.exports;${code}\nexport default module.exports`;
			return { code, map: null };
		}
	};
}
