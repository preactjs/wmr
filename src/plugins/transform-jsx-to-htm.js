// This is an alternative to the official transform.
// It is no longer used.

/** @type {import('../lib/acorn-traverse').Plugin} */
export default function transformJsxToHtm({ types: t, template }) {
	const isIdent = name => /(^[A-Z]|[.$])/.test(name);
	const isRootElement = path => !t.isJSXElement(path.parentPath.parent) && !t.isJSXFragment(path.parentPath.parent);

	return {
		name: 'transform-jsx-to-htm',
		visitor: {
			Program: {
				exit(path, state) {
					// if there's JSX, import HTM:
					if (state.jsx) {
						const opts = state.opts || {};
						const lib = opts.lib || 'htm/preact';
						let imp = opts.import || 'html';
						if (opts.importAs && opts.importAs !== imp) {
							imp += ' as ' + opts.importAs;
						}
						path.get('body').prependString(`import { ${imp} } from ${JSON.stringify(lib)};\n`);
					}
				}
			},
			JSXOpeningElement(path, state) {
				const { node } = path;

				state.jsx = true;

				let str = '<';
				// This is basically `path.node.name.name`, except it could be any expression:
				let name = path.get('name').getSource();
				if (isIdent(name)) name = '${' + name + '}';
				str += name;

				path.get('attributes').forEach(attr => {
					str += ' ';

					// another option here that is grosser but simpler:
					//   return str += attr.getSource().replace('{', '${');
					if (t.isJSXSpreadAttribute(attr)) {
						str += '...${' + attr.get('argument').getSource() + '}';
					} else {
						str += attr.get('name').getSource();
					}

					// We could do the whole clone()/serialize() thing here, but
					// the only transform required is to prepend expressions with "$".
					// We take a shortcut that works in Babel and Acorn (but is gross).
					if (attr.node.value && attr.node.value.value !== true) {
						str += '=';
						const value = attr.get('value').getOutput();
						// if it's an ExpressionContainer, all we need to do is prepend "$"
						if (!t.isLiteral(attr.node.value)) {
							str += '$';
						}
						str += value;
					}
				});

				if (node.selfClosing) str += '/';
				str += '>';

				if (isRootElement(path)) {
					str = 'html`' + str;

					if (node.selfClosing) str += '`';
				}

				path.replaceWithString(str);
			},
			JSXClosingElement(path) {
				const { node } = path;

				let name = node.name.name;
				if (isIdent(name)) name = '/';

				let str = `</${name}>`;
				if (isRootElement(path)) str += '`';

				path.replaceWithString(str);
			},
			JSXExpressionContainer(path) {
				if (t.isJSXEmptyExpression(path.get('expression'))) {
					// <div>a{/*b*/}c</div> --> `<div>ac</div>`
					path.remove();
				} else {
					// <div>{a}</div> --> `<div>${a}</div>`
					path.prependString('$');
				}
			},
			// <div>a</div> --> `<div>a</div>`
			JSXText(path) {
				path.replaceWithString(path.node.value);
			},
			JSXOpeningFragment(path) {
				if (isRootElement(path)) {
					path.replaceWithString('html`');
				} else {
					path.remove();
				}
			},
			JSXClosingFragment(path) {
				if (isRootElement(path)) {
					path.replaceWithString('`');
				} else {
					path.remove();
				}
			}
		}
	};
}
