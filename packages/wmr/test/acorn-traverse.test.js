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

	describe('code generation', () => {
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
			expect(str).toMatchInlineSnapshot('"<x:y a:b="c"/>;"');
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
			expect(doTransform(`<x:y a:b="c">hi</x:y>;`)).toMatchInlineSnapshot(`"html\`<x:y a:b="c">hi</\x:y>\`;"`);
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
