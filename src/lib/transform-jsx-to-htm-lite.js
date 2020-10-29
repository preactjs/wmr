/**
 * This is a lightweight alternative to the official babel-plugin-transform-jsx-to-htm plugin:
 *   https://github.com/developit/htm/blob/master/packages/babel-plugin-transform-jsx-to-htm
 *
 * Its primary advantage is that it preserves all JSX whitespace and formatting as-authored.
 * For this reason, it is used during development and the official plugin is used in production.
 *
 * @param api
 * @param {object} [options]
 * @param {string} [options.tag='html']  The tagged template "tag" function name to produce
 * @param {boolean} [options.terse=false]  Output `<//>` for closing component tags
 * @param {string | false | { module?: string, export?: string }} [options.import=false]  Import the tag automatically
 * @type {import('../lib/acorn-traverse').Plugin}
 */
export default function transformJsxToHtmLite({ types: t }, options = {}) {
	const isIdent = node => {
		if (t.isJSXIdentifier(node)) {
			return /(^[A-Z]|[.$])/.test(node.name);
		} else if (t.isJSXMemberExpression(node)) {
			// <Ctx.Provider>...<//>
			return true;
		}

		return false;
	};
	const isRootElement = path => !t.isJSXElement(path.parentPath.parent) && !t.isJSXFragment(path.parentPath.parent);
	const tagString = options.tag || 'html';
	const tagImport = options.import || false;

	return {
		name: 'transform-jsx-to-htm-lite',
		visitor: {
			Program: {
				// If we processed any JSX in this file, insert an import for HTM:
				exit(path, state) {
					if (state.jsx && tagImport) {
						const lib = typeof tagImport === 'string' ? tagImport : tagImport.module;
						let imp = (typeof tagImport === 'object' && tagImport.export) || tagString;
						if (tagString !== imp) imp += ' as ' + tagString;
						path.get('body').prependString(`import { ${imp} } from '${lib}';\n`);
					}
				}
			},

			/*
			 * Elements (Tags)
			 */

			// The outermost "root" JSX element gets wrapped in a tagged template:
			//   <a>b</a> --> html`<a>b</a>`
			//   <a /> --> html`<a />`
			JSXOpeningElement(path, state) {
				// mark this program as containing JSX
				state.jsx = true;

				// "component" elements have their name identifier turned into an expression:
				// <A /> --> html`<${A} />`
				const name = path.get('name');
				if (isIdent(name.node)) {
					name.prependString('${');
					name.appendString('}');
				}

				if (isRootElement(path)) {
					path.prependString('html`');
				}
				if (path.node.selfClosing) {
					path.appendString('`');
				}
			},
			JSXClosingElement(path) {
				let name = path.node.name.name;

				// handle Component end tags:
				//   terse: </A> --> <//>
				//   normal: </A> --> </${A}>
				if (isIdent(path.node.name)) {
					if (options.terse) name = '/';
					else name = '${' + name + '}';
				}

				let str = `</${name}>`;

				// The outermost JSX element gets wrapped in a tagged template:
				if (isRootElement(path)) str += '`';

				path.replaceWithString(str);
			},

			/*
			 * Fragments
			 */

			// HTM implicitly supports multiple root elements as a Arrays.
			// If the root of a JSX tree is a JSX fragment, it is replaced with html``:
			// <><a /><b /></> --> html`<a /><b />`
			JSXOpeningFragment(path) {
				// Fragments in the middle of a JSX tree are unnecessary and get removed:
				// <a><><b /></></a> --> html`<a><b /></a>`
				if (!isRootElement(path)) return path.remove();

				path.replaceWithString('html`');
			},
			JSXClosingFragment(path) {
				if (!isRootElement(path)) return path.remove();

				path.replaceWithString('`');
			},

			/*
			 * Attributes / Text / Expressions
			 */

			// Note: static attributes are left as-is:
			//   <a b> --> <a b>
			//   <a b="x"> --> <a b="x">

			// JSX spread props: "unwrap" the spreaded value, then prefix the template expression:
			//   <a {...b}> --> <a ...${b}>
			JSXSpreadAttribute(path) {
				path.replaceWith(path.node.argument);
				path.prependString('...${');
				path.appendString('}');
			},

			// JSX Text is "unwrapped" to a String literal:
			// <div>a</div> --> <div>a</div>
			JSXText(path) {
				const text = path.node.value;
				if (/[<>&"]/.test(text)) {
					path.replaceWithString(`\${\`${text}\`}`);
				} else {
					path.replaceWithString(text);
				}
			},

			// JSX Expressions only need a "$" prefix to become tagged template expressions:
			// <a>{b}</a> --> <a>${b}</a>
			// Note: expression attribute values are also JSXExpressionContainers:
			// <a b={c}> --> <a b=${c}>
			JSXExpressionContainer(path) {
				// Empty expressions aren't valid in templates literals, so they are removed:
				// <a>b{/*c*/}d</a> --> <a>bd</a>
				if (t.isJSXEmptyExpression(path.node.expression)) return path.remove();

				path.prependString('$');
			}
		}
	};
}
