import { transform } from '../../lib/acorn-traverse.js';

const CJS_KEYWORDS = /\b(module\.exports|exports)\b/;

export const ESM_KEYWORDS =
	/(\bimport\s*(\{.*?\}\s*from|\s[\w$]+\s+from)?\s*['"]|[\s;]export(\s+(default|const|var|let|function|class)[^\w$]|\s*\{))/;

function acornCjs({ types: t }) {
	return {
		name: 'commonjs-transform',
		visitor: {
			Program(path) {
				for (let i = 0; i < path.node.body.length; i++) {
					const stmt = path.node.body[i];
					if (
						t.isExpressionStatement(stmt) &&
						t.isAssignmentExpression(stmt.expression) &&
						t.isMemberExpression(stmt.expression.left)
					) {
						path
							.get(`body.${i}`)
							.replaceWith(
								t.variableDeclaration('const', [t.variableDeclarator(t.identifier('__default'), stmt.expression.right)])
							);
						path.get(`body.${i}`).appendString(`export default __default;`);
					}
				}
			}
		}
	};
}

/**
 * @returns {import('rollup').Plugin}
 */
export function commonjsPlugin() {
	return {
		name: 'commonjs',
		transform(code, id) {
			const hasCjsKeywords = CJS_KEYWORDS.test(code);
			const hasEsmKeywords = ESM_KEYWORDS.test(code);
			if (!hasCjsKeywords || hasEsmKeywords) return;

			const result = transform(code, {
				parse: this.parse,
				plugins: [acornCjs]
			});

			return {
				code: result.code,
				// FIXME: Sourcemap
				map: null
			};
		}
	};
}
