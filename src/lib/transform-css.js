import { compile, serialize, stringify, middleware, tokenize } from 'stylis';

/**
 * Transform a StyleSheet, applying a suffix to classNames.
 * @NOTE Currently not used. May be used in the future by `wmr/styles-plugin`.
 *
 * @param {string} css StyleSheet text
 * @param {(className: string, additionalClasses?: string, specifier?: string) => string} [transformClassName] A function to remap classNames to namespaced version
 * @param {(element: object) => boolean | empty} [filter] Optionally filter returned rules
 * @returns {string}
 */
export function transformCss(css, transformClassName, filter) {
	const ast = compile(css);
	currentTransformClassName = transformClassName;
	currentFilter = filter;
	return serialize(ast, middleware([prefixClasses, filterRules, stringify]));
}

function filterRules(element) {
	if (element.type === 'rule' && currentFilter && !currentFilter(element)) {
		element.children = [];
	}
}

let currentFilter;
let currentTransformClassName;
let additionalClasses = '';
function prefixClasses(element) {
	if (
		currentTransformClassName &&
		element.type === 'rule' &&
		(!element.parent || element.parent.type !== '@keyframes')
	) {
		let composes = new Set();
		element.children = element.children.filter(child => {
			// TODO: what is composes-with?
			if (child.props !== 'composes' && child.props !== 'composes-with') return true;
			const m = child.children.match(/^\s*(.+?)(?:\s+from\s+(['"])(.*?)\2)?\s*$/);
			if (!m) {
				console.log('failed to parse composes:\n' + child.children);
				return;
			}
			let classes = m[1].split(/\s+/);
			const from = m[3];
			for (let c of classes) {
				if (from) c = currentTransformClassName(c, '', from);
				composes.add(c);
			}
		});
		additionalClasses = composes.size ? ' ' + Array.from(composes).join(' ') : '';
		element.props = element.props.map(selector => processSelector(selector));
	}
}

function applySuffix(str, before, className) {
	className = currentTransformClassName(className, additionalClasses) || className;
	return before + className;
}

// CSS selectors which can have arguments: `.foo:nth-of-type(div)`
// Taken from: https://developer.mozilla.org/en-US/docs/Web/CSS/Pseudo-classes#Index_of_standard_pseudo-classes
const pseudoClassWithArgs = new Set([
	'lang',
	'not',
	'nth-child',
	'nth-last-child',
	'nth-last-of-type',
	'nth-of-type',

	// experimental
	'dir',
	'has',
	'host',
	'host-context',
	'is',
	'nth-col',
	'nth-last-col',
	'where',

	// CSS Modules
	'global'
]);

function processSelector(value, global = false) {
	let out = '';
	const tokens = tokenize(value);
	for (let i = 0; i < tokens.length; i++) {
		const token = tokens[i];
		if (token === ':') {
			const modifier = tokens[++i];
			let next = tokens[i + 1];
			if (modifier === 'global') {
				if (next && next[0] === '(') {
					i++;
					out += next.slice(1, -1);
				} else {
					if (next === ' ') i++;
					global = true;
				}
			} else if (modifier === 'local') {
				if (next && next[0] === '(') {
					i++;
					out += processSelector(next.slice(1, -1), false);
				} else {
					if (next === ' ') i++;
					global = false;
				}
			} else if (pseudoClassWithArgs.has(modifier)) {
				i++;
				// Stylis parses the closing bracket of attribute selectors
				// as a separate token, so we need to stich them back together.
				// `([foo="bar"`+ `]` + `[a="b" + `]` + `)`
				if (next.startsWith('([')) {
					let nextToken = tokens[i + 1];
					while (nextToken && (nextToken === ']' || nextToken.startsWith('[') || nextToken === ')')) {
						i++;
						next += nextToken;
						// Lookahead, but don't increase index to keep the parser
						// state intact
						nextToken = i + 1 < tokens.length ? tokens[i + 1] : '';
					}
				}
				out += `:${modifier}(${processSelector(next.slice(1, -1), global)})`;
			} else {
				out += ':' + modifier;
			}
		} else if (token === ')') {
			global = false;
		} else if (global) {
			out += token;
		} else {
			out += token.replace(/([^[:.]*\.)([^[:.]+)/g, applySuffix);
		}
	}
	return out;
}
