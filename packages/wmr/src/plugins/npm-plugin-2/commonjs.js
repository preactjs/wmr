import { transform } from '../../lib/acorn-traverse.js';

const CJS_KEYWORDS = /\b(module\.exports|exports)\b/;

export const ESM_KEYWORDS =
	/(\bimport\s*(\{.*?\}\s*from|\s[\w$]+\s+from)?\s*['"]|[\s;]export(\s+(default|const|var|let|function|class)[^\w$]|\s*\{))/;

/**
 * Detect if a node represents an IIFE function
 * @param {any} t
 * @param {any} node
 * @returns {boolean}
 */
function isIIFE(t, node) {
	return (
		t.isExpressionStatement(node) &&
		t.isCallExpression(node.expression) &&
		node.expression.arguments.length === 0 &&
		t.isFunctionExpression(node.expression.callee)
	);
}

/**
 * @param {{ production: boolean}} options
 */
function acornCjs(options) {
	return ({ types: t }) => {
		return {
			name: 'commonjs-transform',
			visitor: {
				Program: {
					exit(path) {
						const body = path.node.body;

						// Inline if the whole program is an IIFE
						if (body.length === 1 && isIIFE(t, body[0])) {
							const fnBody = body[0].expression.callee.body.body;

							for (let i = 0; i < fnBody.length; i++) {
								const stmt = fnBody[i];

								// TODO: Use prepend functions with a proper
								// parser.
								if (i === 0) {
									path.get(`body.${i}`).replaceWith(t.cloneDeep(stmt));
								} else {
									path.unshiftContainer('body', t.cloneDeep(stmt));
								}
							}
						}

						for (let i = 0; i < body.length; i++) {
							const stmt = body[i];

							// Detect: `module.exports = ...`
							if (
								t.isExpressionStatement(stmt) &&
								t.isAssignmentExpression(stmt.expression) &&
								t.isMemberExpression(stmt.expression.left) &&
								t.isIdentifier(stmt.expression.left.object) &&
								stmt.expression.left.object.name === 'module' &&
								t.isIdentifier(stmt.expression.left.property) &&
								stmt.expression.left.property.name === 'exports'
							) {
								let replacement = null;

								// Detect: `module.exports = require("...");`
								if (
									t.isCallExpression(stmt.expression.right) &&
									t.isIdentifier(stmt.expression.right.callee) &&
									stmt.expression.right.callee.name === 'require'
								) {
									replacement = t.exportAllDeclaration(t.clone(stmt.expression.right.arguments[0]));

									path.get(`body.${i}`).replaceWith(replacement);
								}
								// Otherwise use a variable instead
								else {
									replacement = t.variableDeclaration('const', [
										t.variableDeclarator(t.identifier('__default'), t.cloneDeep(stmt.expression.right))
									]);

									path.get(`body.${i}`).replaceWith(replacement);
									path.get(`body.${i}`).appendString(`export default __default;`);
								}
							}
						}
					}
				},
				ExpressionStatement(path) {
					// Remove "use strict" directive
					if (t.isLiteral(path.node.expression) && path.node.expression.value === 'use strict') {
						path.remove();
					}
				},
				IfStatement(path) {
					// path.replaceWithString(`const foo = 42;`);
					// return;
					// Detect proxy modules. They usually have the form:
					//
					//   if (process.env.NODE_ENV === 'production') {
					//     module.exports = require('./prod.js');
					//   } else {
					//     module.exports = require('./dev.js');
					//   }
					if (t.isBinaryExpression(path.node.test)) {
						const node = path.node.test;
						const { operator } = path.node.test;

						let envMember = null;
						let literal = null;
						if (t.isMemberExpression(node.left) && t.isLiteral(node.right) && typeof node.right.value === 'string') {
							envMember = path.get(`test.left`);
							literal = path.get(`test.right`);
						} else if (
							t.isMemberExpression(node.right) &&
							t.isLiteral(node.left) &&
							typeof node.left.value === 'string'
						) {
							envMember = path.get(`test.right`);
							literal = path.get(`test.left`);
						}

						if (envMember && literal && envMember.getSource() === 'process.env.NODE_ENV') {
							const actual = options.production ? 'production' : 'development';
							const expected = literal.node.value;

							let replacement;
							if ((operator === '===' && actual === expected) || (operator === '!==' && actual !== expected)) {
								replacement = path.node.consequent;
							} else {
								replacement = path.node.alternate;
							}

							if (replacement !== undefined) {
								if (replacement === null) {
									path.remove();
								} else if (t.isBlockStatement(replacement)) {
									// TODO: Once we have a more stable parser
									// in place we can prependItems
									path.replaceWith(t.cloneDeep(replacement.body[0]));
								} else {
									path.replaceWith(t.cloneDeep(replacement));
								}
							}
						}
					}
				}
			}
		};
	};
}

/**
 * Attempt to convert CommonJS modules to ESM
 * @param {object} options
 * @param {boolean} options.production
 * @returns {import('rollup').Plugin}
 */
export function commonjsPlugin({ production }) {
	return {
		name: 'commonjs',
		async transform(code, id) {
			const hasCjsKeywords = CJS_KEYWORDS.test(code);
			const hasEsmKeywords = ESM_KEYWORDS.test(code);
			if (!hasCjsKeywords || hasEsmKeywords) return;

			const result = transform(code, {
				parse: this.parse,
				plugins: [acornCjs({ production })]
			});

			return {
				code: result.code,
				// FIXME: Sourcemap
				map: null
			};
		}
	};
}
