import { compile, serialize, stringify, middleware, tokenize } from 'stylis';

/**
 * Transform a StyleSheet, applying a suffix to classNames.
 * @NOTE Currently not used. May be used in the future by `wmr/styles-plugin`.
 *
 * @param {string} css StyleSheet text
 * @param {(className: string) => string} [transformClassName] A function to remap classNames to namespaced version
 * @returns {string}
 */
export function transformCss(css, transformClassName) {
	const ast = compile(css);
	currentTransformClassName = transformClassName;
	return serialize(ast, middleware([prefixClasses, stringify]));
}

let currentTransformClassName;
function prefixClasses(element) {
	if (currentTransformClassName && element.type === 'rule') {
		element.props = element.props.map(processSelector);
	}
}

function applySuffix(str, before, className) {
	className = currentTransformClassName(className) || className;
	return before + className;
}

function processSelector(value) {
	let global = false;
	let out = '';
	const tokens = tokenize(value);
	for (let i = 0; i < tokens.length; i++) {
		const token = tokens[i];
		if (token === ':' && tokens[i + 1] === 'global') {
			const next = tokens[++i + 1];
			if (next && next[0] === '(') {
				out += next.substring(1);
				global = true;
			}
		} else if (token === ')') {
			global = false;
		} else if (global) {
			out += token;
		} else {
			// out += token.replace(/([^[:.]*\.[^[:.]+)/g, '$1' + classSuffix);
			out += token.replace(/([^[:.]*\.)([^[:.]+)/g, applySuffix);
		}
	}
	return out;
}
