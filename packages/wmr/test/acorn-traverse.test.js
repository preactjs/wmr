import path from 'path';
import { readdirSync, promises as fs } from 'fs';
import { dent } from './test-helpers.js';
import * as acorn from 'acorn';
import acornJsx from 'acorn-jsx';
import { transform, generate } from '../src/lib/acorn-traverse.js';
import transformJsxToHtm from 'babel-plugin-transform-jsx-to-htm';
// import transformJsxToHtmLite from '../src/lib/transform-jsx-to-htm-lite.js';

const fixtures = path.join(__dirname, 'fixtures/_unit');

const Parser = acorn.Parser.extend(acornJsx());
const parse = (code, opts) => Parser.parse(code, { ecmaVersion: 2020, sourceType: 'module', ...opts });

/** @typedef {import('../src/lib/acorn-traverse.js').Plugin} Plugin */

/**
 * Transform source code using a Babel plugin
 * @param {string} code
 * @param {Plugin | [Plugin] | [Plugin, object]} plugin
 * @param {object} [options]
 */
function transformWithPlugin(code, plugin, options = {}) {
	return transform(code, {
		parse,
		plugins: [plugin],
		...options
	}).code;
}

/**
 * Create a transform() that runs the given bare Babel visitor
 * @param {(t: Parameters<Plugin>[0]['types']) => ReturnType<Plugin>['visitor']} visitor
 */
const withVisitor = visitor => code => transformWithPlugin(code, api => ({ name: '', visitor: visitor(api.types) }));

describe('acorn-traverse', () => {
	it("should have 'filename' in plugin state", () => {
		let filename = '';
		transformWithPlugin(
			'const a = 2;',
			() => ({
				name: 'foo',
				visitor: {
					Program(path, state) {
						filename = state.filename;
					}
				}
			}),
			{ filename: 'foobar.js' }
		);

		expect(filename).toEqual('foobar.js');
	});

	describe('Path', () => {
		it('should support type', () => {
			expect.assertions(1);
			transformWithPlugin(`function foo() {}`, () => ({
				name: 'foo',
				visitor: {
					FunctionDeclaration(path) {
						expect(path.type).toEqual('FunctionDeclaration');
					}
				}
			}));
		});

		it('should set correct parentPath in function declaration', () => {
			expect.assertions(2);
			transformWithPlugin(
				dent`
				function foo({ b }) {
					return 42;
				}`,
				() => ({
					name: 'foo',
					visitor: {
						ReturnStatement(path) {
							expect(path.parentPath.node.type).toEqual('BlockStatement');
							expect(path.parentPath.parentPath.node.type).toEqual('FunctionDeclaration');
						}
					}
				})
			);
		});

		it('should set correct parent in function declaration', () => {
			expect.assertions(1);
			transformWithPlugin(
				dent`
				function foo({ b }) {
					return 42;
				}`,
				() => ({
					name: 'foo',
					visitor: {
						ReturnStatement(path) {
							expect(path.parentPath.parent.type).toEqual('FunctionDeclaration');
						}
					}
				})
			);
		});

		it('should support referencesImport()', () => {
			expect.assertions(13);
			transformWithPlugin(
				dent`
				import bar from "foo";
				import * as boof from "bar";
				import { a as b } from "bob";

				bar();
				boof();
				b();
			`,
				() => ({
					name: 'foo',
					visitor: {
						CallExpression(path) {
							const callee = path.get('callee');

							if (callee.node.name === 'bar') {
								// No importedName
								expect(callee.referencesImport('foo')).toEqual(true);
								expect(callee.referencesImport('bar')).toEqual(false);

								expect(callee.referencesImport('foo', 'default')).toEqual(true);

								expect(callee.referencesImport('foo', '*')).toEqual(false);
								expect(callee.referencesImport('foo', 'foo')).toEqual(false);
							} else if (callee.node.name === 'boof') {
								expect(callee.referencesImport('bar')).toEqual(true);
								expect(callee.referencesImport('bar', '*')).toEqual(true);

								expect(callee.referencesImport('bar', 'default')).toEqual(false);
								expect(callee.referencesImport('bar', 'bar')).toEqual(false);
							} else if (callee.node.name === 'b') {
								expect(callee.referencesImport('bob')).toEqual(true);
								expect(callee.referencesImport('bob', 'a')).toEqual(true);

								expect(callee.referencesImport('nope')).toEqual(false);
								expect(callee.referencesImport('bob', 'b')).toEqual(false);
							}
						}
					}
				})
			);
		});
	});

	describe('template', () => {
		it('should not throw with no replacements', () => {
			const str = transformWithPlugin('const a = 2', ({ types: t, template }) => {
				const tpl = template`const AbCdE = 42`;
				return {
					name: 'foo',
					visitor: {
						VariableDeclaration(path) {
							if (path.node.declarations[0].id.name !== 'a') return;
							path.replaceWith(tpl());
						}
					}
				};
			});

			expect(str).toMatchInlineSnapshot('"const AbCdE = 42;"');
		});

		it('should apply replacements', () => {
			const str = transformWithPlugin('const [v, set] = useState(0);', ({ types: t, template }) => {
				let applied = false;

				const tpl = template`addHookName(HOOK, NAME)`;
				return {
					name: 'foo',
					visitor: {
						CallExpression(path) {
							const callee = path.get('callee');
							const hookName = callee.node.name;

							if (hookName !== 'useState' || applied) return;
							applied = true;

							path.replaceWith(
								tpl({
									HOOK: t.clone(path.node),
									NAME: t.stringLiteral('foo')
								})
							);
						}
					}
				};
			});

			expect(str).toMatchInlineSnapshot(`"const [v, set] = addHookName(useState(0), 'foo');"`);
		});
	});

	describe('Babel compat', () => {
		it('should support path.hub', () => {
			expect.assertions(1);
			transformWithPlugin(
				'const a = 2',
				() => {
					return {
						name: 'foo',
						visitor: {
							NumericLiteral(path) {
								expect(path.hub.file.opts.filename).toEqual('foo.js');
							}
						}
					};
				},
				{ filename: 'foo.js' }
			);
		});

		it('should visit NumericLiteral', () => {
			let type;
			transformWithPlugin('const a = 2', () => {
				return {
					name: 'foo',
					visitor: {
						NumericLiteral(path) {
							type = path.node.type;
						}
					}
				};
			});

			expect(type).toEqual('NumericLiteral');
		});

		it('should generate NumericLiteral', () => {
			const str = transformWithPlugin('const a = x', ({ types: t }) => {
				return {
					name: 'foo',
					visitor: {
						Identifier(path) {
							if (path.node.name !== 'x') return;
							path.replaceWith(t.numericLiteral(42));
						}
					}
				};
			});

			expect(str).toEqual('const a = 42');
		});

		it('should visit StringLiteral', () => {
			let type;
			transformWithPlugin('const a = "2"', () => {
				return {
					name: 'foo',
					visitor: {
						StringLiteral(path) {
							type = path.node.type;
						}
					}
				};
			});

			expect(type).toEqual('StringLiteral');
		});

		it('should generate StringLiteral', () => {
			const str = transformWithPlugin('const a = x', ({ types: t }) => {
				return {
					name: 'foo',
					visitor: {
						Identifier(path) {
							if (path.node.name !== 'x') return;
							path.replaceWith(t.stringLiteral('abc'));
						}
					}
				};
			});

			expect(str).toEqual(`const a = 'abc'`);
		});

		it('should visit BooleanLiteral', () => {
			let type;
			transformWithPlugin('const a = true', () => {
				return {
					name: 'foo',
					visitor: {
						BooleanLiteral(path) {
							type = path.node.type;
						}
					}
				};
			});

			expect(type).toEqual('BooleanLiteral');
		});

		it('should generate BooleanLiteral', () => {
			const str = transformWithPlugin('const a = x', ({ types: t }) => {
				return {
					name: 'foo',
					visitor: {
						Identifier(path) {
							if (path.node.name !== 'x') return;
							path.replaceWith(t.booleanLiteral(true));
						}
					}
				};
			});

			expect(str).toEqual(`const a = true`);
		});

		it('should visit NullLiteral', () => {
			let type;
			transformWithPlugin('const a = null', () => {
				return {
					name: 'foo',
					visitor: {
						NullLiteral(path) {
							type = path.node.type;
						}
					}
				};
			});

			expect(type).toEqual('NullLiteral');
		});

		it('should generate NullLiteral', () => {
			const str = transformWithPlugin('const a = x', ({ types: t }) => {
				return {
					name: 'foo',
					visitor: {
						Identifier(path) {
							if (path.node.name !== 'x') return;
							path.replaceWith(t.nullLiteral());
						}
					}
				};
			});

			expect(str).toEqual(`const a = null`);
		});
	});

	describe('Scope', () => {
		it('should support hasBinding()', () => {
			expect.assertions(1);
			transformWithPlugin('const a = 1', () => {
				return {
					name: 'foo',
					visitor: {
						Identifier(path) {
							expect(path.scope.hasBinding('a')).toEqual(true);
						}
					}
				};
			});
		});

		it('should support getFunctionParent()', () => {
			expect.assertions(2);
			transformWithPlugin('function foo() {const a = 1}', () => {
				return {
					name: 'foo',
					visitor: {
						VariableDeclaration(path) {
							const fn = path.scope.getFunctionParent();
							expect(fn.path.node.type).toEqual('FunctionDeclaration');
							expect(fn.path.node.id.name).toEqual('foo');
						}
					}
				};
			});
		});

		it('should support getBlockParent()', () => {
			expect.assertions(2);
			transformWithPlugin('function foo() {const a = 1}', () => {
				return {
					name: 'foo',
					visitor: {
						VariableDeclaration(path) {
							const fn = path.scope.getBlockParent();
							expect(fn.path.node.type).toEqual('FunctionDeclaration');
							expect(fn.path.node.id.name).toEqual('foo');
						}
					}
				};
			});
		});

		it('should support getProgramParent()', () => {
			expect.assertions(1);
			transformWithPlugin('function foo() {const a = 1}', () => {
				return {
					name: 'foo',
					visitor: {
						VariableDeclaration(path) {
							let id = path.scope.getProgramParent();
							expect(id.path.node.type).toEqual('Program');
						}
					}
				};
			});
		});

		it('should support push()', () => {
			const str = transformWithPlugin('function foo() {const a = 1}', ({ types: t }) => {
				let parsed = new Set();
				return {
					name: 'foo',
					visitor: {
						NumericLiteral(path) {
							if (parsed.has(path.node)) return;
							parsed.add(path.node);
							path.scope.push({
								id: t.identifier('abc'),
								init: t.stringLiteral('foo')
							});
						}
					}
				};
			});

			expect(str).toEqual(`function foo() {\n  let abc = 'foo';\n  const a = 1;\n}`);
		});

		it('should track variable bindings', () => {
			let bindings = new Set();
			transformWithPlugin('const a = x, b = 2; const c = 123', () => {
				return {
					name: 'foo',
					visitor: {
						Identifier(path) {
							Object.keys(path.scope.bindings).forEach(k => bindings.add(k));
						}
					}
				};
			});

			expect(Array.from(bindings)).toEqual(['a', 'b', 'c']);
		});

		it('should support generateUidIdentifier()', () => {
			expect.assertions(6);
			transformWithPlugin('function foo() {const a = 1}', () => {
				return {
					name: 'foo',
					visitor: {
						VariableDeclaration(path) {
							const id = path.scope.generateUidIdentifier('foo');
							expect(id.type).toEqual('Identifier');
							expect(id.name).toEqual('_foo');
						},
						NumericLiteral(path) {
							const id = path.scope.generateUidIdentifier('a');
							expect(id.type).toEqual('Identifier');
							expect(id.name).toEqual('_a');

							const id2 = path.scope.generateUidIdentifier('a');
							expect(id2.type).toEqual('Identifier');
							expect(id2.name).toEqual('_a1');
						}
					}
				};
			});
		});

		describe('Block Scope', () => {
			it('should overwrite variables', () => {
				expect.assertions(4);
				transformWithPlugin(
					dent`
					const a = 1;
					{
						a = 42;
					}`,
					() => {
						return {
							name: 'foo',
							visitor: {
								ExpressionStatement(path) {
									const a = path.scope.getBinding('a');
									expect(a).toBeDefined();

									expect(a.path.node.type).toEqual('VariableDeclarator');
									expect(a.path.parentPath.node.type).toEqual('VariableDeclaration');
									expect(a.path.parent.type).toEqual('VariableDeclaration');
								}
							}
						};
					}
				);
			});
		});

		describe('Function Scope', () => {
			it('should overwrite with function arg', () => {
				expect.assertions(4);
				transformWithPlugin(
					dent`
					const a = 1;
					function foo(b) {
						return 42;
					}
					const b = 2;`,
					() => {
						return {
							name: 'foo',
							visitor: {
								ReturnStatement(path) {
									expect(path.scope.getBinding('a')).toBeDefined();

									const b = path.scope.getBinding('b');
									expect(b).toBeDefined();
									expect(b.path.node.type).toEqual('Identifier');
									expect(b.path.parentPath.node.type).toEqual('FunctionDeclaration');
								}
							}
						};
					}
				);
			});

			it('should work with destructured function arg', () => {
				expect.assertions(4);
				transformWithPlugin(
					dent`
					const a = 1;
					function foo({ b }) {
						return 42;
					}
					const b = 2;`,
					() => {
						return {
							name: 'foo',
							visitor: {
								ReturnStatement(path) {
									expect(path.scope.getBinding('a')).toBeDefined();

									const b = path.scope.getBinding('b');
									expect(b).toBeDefined();
									expect(b.path.node.type).toEqual('ObjectPattern');
									expect(b.path.parentPath.node.type).toEqual('FunctionDeclaration');
								}
							}
						};
					}
				);
			});

			it('should work with destructured renamed function arg', () => {
				expect.assertions(4);
				transformWithPlugin(
					dent`
					const a = 1;
					function foo({ x: b }) {
						return 42;
					}
					const b = 2;`,
					() => {
						return {
							name: 'foo',
							visitor: {
								ReturnStatement(path) {
									expect(path.scope.getBinding('a')).toBeDefined();

									const b = path.scope.getBinding('b');
									expect(b).toBeDefined();
									expect(b.path.node.type).toEqual('ObjectPattern');
									expect(b.path.parentPath.node.type).toEqual('FunctionDeclaration');
								}
							}
						};
					}
				);
			});

			it('should work with default function arg value', () => {
				expect.assertions(4);
				transformWithPlugin(
					dent`
					const a = 1;
					function foo({ b = 42 }) {
						return 42;
					}
					const b = 2;`,
					() => {
						return {
							name: 'foo',
							visitor: {
								ReturnStatement(path) {
									expect(path.scope.getBinding('a')).toBeDefined();

									const b = path.scope.getBinding('b');
									expect(b).toBeDefined();
									expect(b.path.node.type).toEqual('ObjectPattern');
									expect(b.path.parentPath.node.type).toEqual('FunctionDeclaration');
								}
							}
						};
					}
				);
			});

			it('should work with array function arg value', () => {
				expect.assertions(4);
				transformWithPlugin(
					dent`
					const a = 1;
					function foo([b]) {
						return 42;
					}
					const b = 2;`,
					() => {
						return {
							name: 'foo',
							visitor: {
								ReturnStatement(path) {
									expect(path.scope.getBinding('a')).toBeDefined();

									const b = path.scope.getBinding('b');
									expect(b).toBeDefined();
									expect(b.path.node.type).toEqual('ArrayPattern');
									expect(b.path.parentPath.node.type).toEqual('FunctionDeclaration');
								}
							}
						};
					}
				);
			});

			it('should work with array function default arg value', () => {
				expect.assertions(4);
				transformWithPlugin(
					dent`
					const a = 1;
					function foo([b = 42]) {
						return 42;
					}
					const b = 2;`,
					() => {
						return {
							name: 'foo',
							visitor: {
								ReturnStatement(path) {
									expect(path.scope.getBinding('a')).toBeDefined();

									const b = path.scope.getBinding('b');
									expect(b).toBeDefined();
									expect(b.path.node.type).toEqual('ArrayPattern');
									expect(b.path.parentPath.node.type).toEqual('FunctionDeclaration');
								}
							}
						};
					}
				);
			});
		});

		describe('Scope in loops', () => {
			it('should work in for-loops', () => {
				expect.assertions(5);
				transformWithPlugin(
					dent`
					const a = 1;
					for (let i = 0; i < 10; i++) {
						break;
					}
					const b = 2;`,
					() => {
						return {
							name: 'foo',
							visitor: {
								VariableDeclarator(path) {
									if (path.node.id.name !== 'a') return;

									expect(path.scope.getBinding('i')).toBeUndefined();
								},
								BreakStatement(path) {
									const i = path.scope.getBinding('i');
									expect(i).toBeDefined();
									expect(i.path.node.type).toEqual('VariableDeclarator');
									expect(i.path.parentPath.node.type).toEqual('VariableDeclaration');
									expect(i.path.parent.type).toEqual('VariableDeclaration');
								}
							}
						};
					}
				);
			});

			it('should work in while-loops', () => {
				expect.assertions(4);
				transformWithPlugin(
					dent`
					const a = 1;
					while (true) {
						let a = 42
						break;
					}`,
					({ types: t }) => {
						return {
							name: 'foo',
							visitor: {
								VariableDeclarator(path) {
									const p = path.scope.getBinding('a').path;
									if (t.isProgram(path.parentPath.parent)) {
										expect(p.node.type).toEqual('VariableDeclarator');
										expect(p.node.init.value).toEqual(1);
									} else {
										expect(p.node.type).toEqual('VariableDeclarator');
										expect(p.node.init.value).toEqual(42);
									}
								}
							}
						};
					}
				);
			});
		});

		describe('Module Scope', () => {
			it('should track default imports', () => {
				expect.assertions(4);
				transformWithPlugin(
					dent`
					import a from "foo";
					a + 1;
					`,
					() => {
						return {
							name: 'foo',
							visitor: {
								ExpressionStatement(path) {
									const a = path.scope.getBinding('a');
									expect(a).toBeDefined();

									expect(a.path.node.type).toEqual('ImportDefaultSpecifier');
									expect(a.path.parentPath.node.type).toEqual('ImportDeclaration');
									expect(a.path.parent.type).toEqual('ImportDeclaration');
								}
							}
						};
					}
				);
			});

			it('should track namespaced imports', () => {
				expect.assertions(4);
				transformWithPlugin(
					dent`
					import * as a from "foo";
					a + 1;
					`,
					() => {
						return {
							name: 'foo',
							visitor: {
								ExpressionStatement(path) {
									const a = path.scope.getBinding('a');
									expect(a).toBeDefined();

									expect(a.path.node.type).toEqual('ImportNamespaceSpecifier');
									expect(a.path.parentPath.node.type).toEqual('ImportDeclaration');
									expect(a.path.parent.type).toEqual('ImportDeclaration');
								}
							}
						};
					}
				);
			});

			it('should track named imports', () => {
				expect.assertions(4);
				transformWithPlugin(
					dent`
					import {foo as a} from "foo";
					a + 1;
					`,
					() => {
						return {
							name: 'foo',
							visitor: {
								ExpressionStatement(path) {
									const a = path.scope.getBinding('a');
									expect(a).toBeDefined();

									expect(a.path.node.type).toEqual('ImportSpecifier');
									expect(a.path.parentPath.node.type).toEqual('ImportDeclaration');
									expect(a.path.parent.type).toEqual('ImportDeclaration');
								}
							}
						};
					}
				);
			});
		});
	});

	describe('Visitor', () => {
		it('should call function visitor', () => {
			expect.assertions(1);
			transformWithPlugin(`function foo() {}`, () => ({
				name: 'foo',
				visitor: {
					FunctionDeclaration(path) {
						expect(path.node.type).toEqual('FunctionDeclaration');
					}
				}
			}));
		});

		it('should call enter and exit visitor', () => {
			expect.assertions(2);
			transformWithPlugin(`function foo() {}`, () => ({
				name: 'foo',
				visitor: {
					FunctionDeclaration: {
						enter(path) {
							expect(path.node.type).toEqual('FunctionDeclaration');
						},
						exit(path) {
							expect(path.node.type).toEqual('FunctionDeclaration');
						}
					}
				}
			}));
		});

		it('should visit merged visitor function', () => {
			expect.assertions(2);
			transformWithPlugin(
				dent`
				const NotFound = () => (
					<section>
						<h1>404: Not Found</h1>
						<p>It's gone :(</p>
					</section>
				);
				
				export default NotFound;`,
				() => ({
					name: 'foo',
					visitor: {
						'ArrowFunctionExpression|FunctionExpression': {
							enter(path) {
								expect(path.node.type).toEqual('ArrowFunctionExpression');
							},
							exit(path) {
								expect(path.node.type).toEqual('ArrowFunctionExpression');
							}
						}
					}
				})
			);
		});
	});

	describe('code generation', () => {
		// FIXME: Repeated operations break string generation here
		it.skip('should generate import statements', () => {
			const str = transformWithPlugin(
				dent`
					a;
				`,
				({ types: t }) => {
					return {
						name: 'foo',
						visitor: {
							Program(path) {
								path.pushContainer('body', t.importDeclaration([], t.stringLiteral('foo')));

								path.pushContainer(
									'body',
									t.importDeclaration([t.importDefaultSpecifier(t.identifier('foo'))], t.stringLiteral('foo'))
								);

								path.pushContainer(
									'body',
									t.importDeclaration([t.importNamespaceSpecifier(t.identifier('bar'))], t.stringLiteral('foo'))
								);

								path.pushContainer(
									'body',
									t.importDeclaration(
										[
											t.importSpecifier(t.identifier('baz')),
											t.importSpecifier(t.identifier('baba'), t.identifier('boof'))
										],
										t.stringLiteral('foo')
									)
								);

								path.pushContainer(
									'body',
									t.importDeclaration(
										[t.importDefaultSpecifier(t.identifier('foobar')), t.importSpecifier(t.identifier('asdf'))],
										t.stringLiteral('foo')
									)
								);
							}
						}
					};
				}
			);

			expect(str).toEqual(dent`
				a;
				import 'foo';
				import foo from 'foo';
				import * as bar from 'foo';
				import { baz, boof as baba } from 'foo';
				import foobar, { asdf } from 'foo';
			`);
		});

		it('should generate variable declarations', () => {
			const str = transformWithPlugin('function foo(){}\nfunction bar() {}', ({ types: t }) => {
				return {
					name: 'foo',
					visitor: {
						FunctionDeclaration(path) {
							// Replace with:
							//   const a = 1;
							//   a = 2;
							if (path.node.id.name === 'foo') {
								const ast = t.variableDeclaration('const', [
									t.variableDeclarator(t.identifier('a'), t.numericLiteral(1))
								]);
								path.replaceWith(ast);
							} else {
								const ast2 = t.assignmentExpression('=', t.identifier('a'), t.numericLiteral(2));
								path.replaceWith(ast2);
							}
						}
					}
				};
			});

			expect(str).toEqual(`const a = 1;\na = 2`);
		});

		it('should generate class properties', () => {
			const str = transformWithPlugin('const a = x', ({ types: t }) => {
				return {
					name: 'foo',
					visitor: {
						Identifier(path) {
							if (path.node.name !== 'x') return;
							const ast = t.classDeclaration(
								t.identifier('Foo'),
								null,
								t.classBody([t.classProperty(t.identifier('foo'), t.numericLiteral(42))])
							);
							path.replaceWith(ast);
						}
					}
				};
			});

			expect(str).toEqual(`const a = class Foo {\n  foo = 42;\n\n}`);
		});

		it('should parse and regenerate ES2020 syntax', async () => {
			// While we try to avoid doing (full) codegen for performance reasons,
			// it needs to account for 100% of the es2020 spec (plus JSX for good measure).

			let source = await fs.readFile(path.join(fixtures, 'es2020.js'), 'utf-8');
			// normalize to 2-space and remove comments
			source = source.replace(/\t/g, '  ').replace(/(?<=^|\n)(?:\/\/[^\n]*|\/\*[\s\S]*?\*\/)(\n|$)/g, '');
			const ast = parse(source);
			const generated = generate(ast);
			expect(generated).toBe(source);
		});

		it('should remove JSXEmptyExpression', () => {
			let str = generate(parse(`<A>{/* comment */}</A>;`)).trim();
			expect(str).toMatchInlineSnapshot('"<A></A>;"');

			str = generate(parse(`<A>{}</A>;`)).trim();
			expect(str).toMatchInlineSnapshot('"<A></A>;"');
		});

		it('should serialize JSXMemberExpression', () => {
			const str = generate(parse(`<a.b.c />`)).trim();
			expect(str).toMatchInlineSnapshot('"<a.b.c/>;"');
		});

		it('should serialize JSXNamespacedName (namespaced attributes)', () => {
			const str = generate(parse(`<x:y a:b="c" />`)).trim();
			expect(str).toMatchInlineSnapshot('"<x:y a:b=\\"c\\"/>;"');
		});

		it('should serialize created JSXAttributes', () => {
			const str = transformWithPlugin('<div />', ({ types: t }) => {
				return {
					name: 'foo',
					visitor: {
						JSXOpeningElement(path) {
							// eslint-disable-next-line new-cap
							const attr = t.JSXAttribute(t.JSXIdentifier('foo'), t.stringLiteral('bar'));
							path.pushContainer('attributes', attr);
						}
					}
				};
			});

			expect(str).toMatchInlineSnapshot(`"<div foo=\\"bar\\"/>"`);
		});
	});

	describe('transform()', () => {
		it('should support insertAfter()', () => {
			const str = transformWithPlugin(
				dent`
				function foo() {}`,
				({ types: t }) => ({
					name: 'foo',
					visitor: {
						FunctionDeclaration(path) {
							path.insertAfter(
								t.variableDeclaration('const', [t.variableDeclarator(t.identifier('bar'), t.numericLiteral(1))])
							);
						}
					}
				})
			);

			expect(str).toEqual('function foo() {}\nconst bar = 1;\n');
		});

		it.skip('should support calling insertAfter() twice', () => {
			const str = transformWithPlugin(
				dent`
				function foo() {}`,
				({ types: t }) => ({
					name: 'foo',
					visitor: {
						FunctionDeclaration(path) {
							path.insertAfter(
								t.variableDeclaration('const', [t.variableDeclarator(t.identifier('bar'), t.numericLiteral(1))])
							);
							path.insertAfter(
								t.variableDeclaration('let', [t.variableDeclarator(t.identifier('boof'), t.numericLiteral(2))])
							);
						}
					}
				})
			);

			expect(str).toEqual('function foo() {}\nlet boof = 2;\nconst bar = 1;\n');
		});

		it('should regenerate destructured parameters', () => {
			const transform = withVisitor(t => ({
				TaggedTemplateExpression(path) {
					const tag = t.callExpression(t.identifier('$tag'), [t.clone(path.node.tag)]);
					const quasi = t.clone(path.node.quasi);
					path.skip();
					path.replaceWith(t.taggedTemplateExpression(tag, quasi));
				}
			}));

			expect(transform('const a = 1;')).toMatchInlineSnapshot(`"const a = 1;"`);

			expect(transform('const fn = (a) => 1;')).toMatchInlineSnapshot(`"const fn = (a) => 1;"`);

			expect(transform('const fn = ([a]) => a;')).toMatchInlineSnapshot(`"const fn = ([a]) => a;"`);
			expect(transform('html`${x.map(([a, b]) => ({ a, b }))}`;')).toMatchInlineSnapshot(
				`"$tag(html)\`\${x.map(([a, b]) => ({ a, b }))}\`;"`
			);
			expect(transform('html`${x.map(([a, b, c]) => ({ a, b, c }))}`;')).toMatchInlineSnapshot(
				`"$tag(html)\`\${x.map(([a, b, c]) => ({ a, b, c }))}\`;"`
			);
		});
	});

	describe('jsx-to-htm', () => {
		describe('prod', () => {
			it('should regenerate destructured parameters', () => {
				const doTransform = code => transformWithPlugin(code, transformJsxToHtm);

				expect(doTransform('const fn = (a) => 1;')).toMatchInlineSnapshot(`"const fn = (a) => 1;"`);

				expect(doTransform('const fn = ([a]) => a;')).toMatchInlineSnapshot(`"const fn = ([a]) => a;"`);

				expect(doTransform('<>{x.map(a => <a>{a}</a>)}</>;')).toMatchInlineSnapshot(
					`"html\`\${x.map(a => html\`<a>\${a}</a>\`)}\`;"`
				);

				expect(doTransform('<>${x.map(([a,b,c]) => <a>{{a,b,c}}</a>)}</>;')).toMatchInlineSnapshot(
					`"html\`$\${x.map(([a, b, c]) => html\`<a>\${{ a, b, c }}</a>\`)}\`;"`
				);

				expect(
					doTransform(dent`
						(
							<>
								{y.map(([k, v]) => (
									<li>
										{k}: {v}
									</li>
								))}
							</>
						);
					`)
				).toMatchInlineSnapshot(`
			"(
				html\`
					\${y.map(([k, v]) => html\`<li>
							\${k}: \${v}
						</li>\`)}
				\`
			);"
		`);
			});
		});

		it('should remove whitespaces with compact option', () => {
			const doTransform = code => transformWithPlugin(code, transformJsxToHtm);
			const doTransformWithCompact = code =>
				transformWithPlugin(code, transformJsxToHtm, { generatorOpts: { compact: true } });

			const expression = dent`
				(
					<>
						<div>top</div>
						<span>bottom</span>
					</>
				);
			`;

			// Should keep the newlines formatting
			expect(doTransform(expression)).toMatchInlineSnapshot(`
			"(
				html\`
					<div>top</div>
					<span>bottom</span>
				\`
			);"
		`);

			// Should remove the whitespaces between the HTM generated syntax
			expect(doTransformWithCompact(expression)).toMatchInlineSnapshot(`
			"(
				html\`<div>top</div><span>bottom</span>\`
			);"
			`);
		});

		it('should replace newlines with a space with compact option', () => {
			const doTransform = code => transformWithPlugin(code, transformJsxToHtm);
			const doTransformWithCompact = code =>
				transformWithPlugin(code, transformJsxToHtm, { generatorOpts: { compact: true } });

			const expression = dent`
				(
					<p>hello
						world
					<p>это

						👩‍🚀</p>
					</p>
				);
			`;

			// Should keep the newlines formatting
			expect(doTransform(expression)).toMatchInlineSnapshot(`
			"(
				html\`<p>hello
					world
				<p>это

					👩‍🚀</p>
				</p>\`
			);"
		`);

			// Should remove the whitespaces between the HTM generated syntax
			expect(doTransformWithCompact(expression)).toMatchInlineSnapshot(`
			"(
				html\`<p>hello world <p>это 👩‍🚀</p></p>\`
			);"
			`);
		});

		it('should handle root memberExpression component names', () => {
			const doTransform = code => transformWithPlugin(code, transformJsxToHtm, { generatorOpts: { compact: true } });

			// Should keep the newlines formatting
			expect(doTransform(`<A.B>hi</A.B>;`)).toMatchInlineSnapshot(`"html\`<\${A.B}>hi</\${A.B}>\`;"`);
		});

		it('should serialize namespaced attributes', () => {
			const doTransform = code => transformWithPlugin(code, transformJsxToHtm, { generatorOpts: { compact: true } });

			// Should keep the newlines formatting
			expect(doTransform(`<x:y a:b="c">hi</x:y>;`)).toMatchInlineSnapshot(`"html\`<x:y a:b=\\"c\\">hi</x:y>\`;"`);
		});
	});

	describe('fixtures', () => {
		const cases = readdirSync(fixtures).filter(f => f[0] !== '.');
		it.each(cases.filter(f => f.match(/\.expected/)))('fixtures', async expectedFile => {
			const expected = await fs.readFile(path.join(fixtures, expectedFile), 'utf-8');
			const source = await fs.readFile(path.join(fixtures, expectedFile.replace('.expected', '')), 'utf-8');
			const actual = transformWithPlugin(source, [
				transformJsxToHtm,
				{
					tag: '$$html'
				}
			]);
			expect(actual).toEqual(expected);
		});
	});
});
