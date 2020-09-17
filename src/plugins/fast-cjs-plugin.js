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

			let specs = new Map();
			let ns = new Map();
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
				return `${before}Object.defineProperty(${spec.id}||{},'default',{value:${spec.id}})`;
			});

			let imports = '';
			specs.forEach(spec => {
				imports += `import * as ${spec.id} from ${spec.specifier};`;
			});

			code = `${imports}var module={exports:{}},exports=module.exports;${code}\nexport default module.exports`;
			return { code, map: null };
		}
	};
}
