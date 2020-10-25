import parse from './cjs-module-lexer.js';

const CJS_KEYWORDS = /\b(module\.exports|exports)\b/;

const ESM_KEYWORDS = /(\bimport\s*(\{|\s['"\w_$])|[\s;]export(\s+(default|const|var|let)[^\w$]|\s*\{))/;

/** @template T @typedef {Promise<T>|T} MaybePromise */

/** @typedef {(specifier: string, id?: string) => MaybePromise<string|false|null|void>} ResolveFn */

/**
 * @param {string} code Module code
 * @param {string} id Source module specifier
 */
export async function transformRequires(code, id) {
	if (!['js', 'cjs'].some(ext => id.endsWith(ext))) return code;

	const hasCjsKeywords = CJS_KEYWORDS.test(code);
	const hasEsmKeywords = ESM_KEYWORDS.test(code);
	if (!hasCjsKeywords || hasEsmKeywords) return code;

	const { requires, exports, reexports } = await parse(code, id);
	let out = code;

	console.log('transforming', exports, reexports, requires);

	for (const item of requires) {
		const spec = code.substr(item.s, item.e - 2);
		code = code.replace('require(' + spec + ')', 'from ' + spec);
		// TODO: figure out how to get the imported token.
	}

	for (const item of exports) {
		// TODO: this is just the exported name, how will we use this to transform anything without doing a textual lookup...
		console.log('export', item);
	}

	// TODO: this is not picked up by cjs-module-lexer
	if (code.includes('module.exports =')) {
		code = code.replace('module.exports =', 'export default');
	}

	return out;
}
