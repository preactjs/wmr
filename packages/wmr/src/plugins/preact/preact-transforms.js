import { transform } from '../../lib/acorn-traverse.js';
import hookNames from 'babel-plugin-transform-hook-names';

/**
 * Inject Prefresh runtime for on the fly hot module reloading
 * of Preact components.
 * @param {object} options
 * @param {boolean} options.sourcemap
 * @returns {import('rollup').Plugin}
 */
export function preactTransforms({ sourcemap }) {
	return {
		name: 'preact-transforms',
		transform(code, id) {
			if (!/\.([tj]sx?|[mc]js)$/.test(id)) return;

			return transform(code, {
				plugins: [transformJsxSource, hookNames],
				sourceMaps: !!sourcemap,
				filename: id,
				parse: this.parse
			});
		}
	};
}

/**
 * @type {import('../../lib/acorn-traverse').Plugin}
 */
function transformJsxSource({ types: t }) {
	return {
		name: 'transform-jsx-source',
		visitor: {
			JSXOpeningElement(path, state) {
				if (t.isJSXIdentifier(path.node.name) && /^[A-Z]/.test(path.node.name)) {
					path.node.attributes.push(t.JSXAttribute(t.JSXIdentifier('__source'), t.stringLiteral(state.filename)));
				}
			}
		}
	};
}
