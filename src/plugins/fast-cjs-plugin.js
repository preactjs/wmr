const CJS_KEYWORDS = /\b(module\.exports|exports)\b/;

export const ESM_KEYWORDS = /(\bimport\s*(\{|\s['"\w_$])|[\s;]export(\s+(default|const|var|let)[^\w$]|\s*\{))/;

const HELPER = `function $$cjs_default$$(m,i){for(i in m)if(i!='default')return m;return m.default||m}`;

/**
 * Extremely loose and questionable (but fast) conversion from CJS to ESM.
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

			let insertHelper = false;
			let specs = new Map();
			let ns = new Map();
			// This is a regex being used to parse code, which is of course horrible.
			// It needs to be replaced with https://github.com/guybedford/cjs-module-lexer
			code = code.replace(/\/\*[\s\S]*?\*\//g, '');
			code = code.replace(/([^.\w$])require\s*\((['"])(.*?)\2\)/g, (str, before, quote, specifier) => {
				let spec = specs.get(specifier);
				if (!spec) {
					let id = '$cjs$' + specifier.replace(/[^\w_$]+/g, '_');
					let count = (ns.get(id) || 0) + 1;
					ns.set(id, count);
					if (count > 1) id += count;
					spec = { id, specifier: quote + specifier + quote };
					specs.set(specifier, spec);
				}
				insertHelper = true;
				return `${before}$$cjs_default$$(${spec.id})`;
			});

			let imports = '';
			specs.forEach(spec => {
				imports += `import * as ${spec.id} from ${spec.specifier};`;
			});

			let preamble = imports;
			if (insertHelper) preamble += HELPER;

			code = `${preamble}var module={exports:{}},exports=module.exports;${code}\nexport default module.exports`;
			return { code, map: null };
		}
	};
}
