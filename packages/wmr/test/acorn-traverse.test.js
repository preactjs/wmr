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

	describe('code generation', () => {
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
			expect(transform('html`${x.map(([a,b]) => ({a,b}))}`;')).toMatchInlineSnapshot(
				`"$tag(html)\`\${x.map(([a,b]) => ({a,b}))}\`;"`
			);
			expect(transform('html`${x.map(([a,b,c]) => ({a,b,c}))}`;')).toMatchInlineSnapshot(
				`"$tag(html)\`\${x.map(([a,b,c]) => ({a,b,c}))}\`;"`
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

				expect(doTransform('<>${x.map(([a,b,c]) => <a>{{a,b,c}}</a>)}</>;')).toMatchInlineSnapshot(`
			"html\`$\${x.map(([a, b, c]) => html\`<a>\${{
			  a,
			  b,
			  c
			}}</a>\`)}\`;"
		`);

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
