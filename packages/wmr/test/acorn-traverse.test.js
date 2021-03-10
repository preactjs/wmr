import path from 'path';
import { readdirSync, promises as fs } from 'fs';
import { dent } from './test-helpers.js';
import * as acorn from 'acorn';
import acornJsx from 'acorn-jsx';
import { transform, generate } from '../src/lib/acorn-traverse.js';
import transformJsxToHtm from 'babel-plugin-transform-jsx-to-htm';
import transformPrefreshRegistrations from '../src/lib/transform-prefresh-registrations.js';
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
		filename: 'test.jsx',
		...options
	}).code;
}

/**
 * Create a transform() that runs the given bare Babel visitor
 * @param {(t: Parameters<Plugin>[0]['types']) => ReturnType<Plugin>['visitor']} visitor
 */
const withVisitor = visitor => code => transformWithPlugin(code, api => ({ name: '', visitor: visitor(api.types) }));

describe('acorn-traverse', () => {
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

	describe('prefresh-registrations', () => {
		const doTransform = code => transformWithPlugin(code, transformPrefreshRegistrations);
		it('should generate signatures for Prefresh', () => {
			// TODO: this var from insertAfter is missing
			expect(doTransform(`const Component = () => {}`)).toMatchInlineSnapshot(`
			"var _c0;
			const Component = () => {};
			_c0 = Component;
			$RefreshReg$(_c0, 'Component');
			"
		`);
			expect(doTransform(`const nonComponent = () => {}`)).toMatchInlineSnapshot(`"const nonComponent = () => {}"`);

			expect(
				doTransform(`
				const Component = () => {};
				const Component2 = () => {};

				`)
			).toMatchInlineSnapshot(`
				"var _c0, _c1;
				const Component = () => {};
				_c0 = Component;
				const Component2 = () => {};
				_c1 = Component2;
				$RefreshReg$(_c0, 'Component');
				$RefreshReg$(_c1, 'Component2');
				"
			`);

			expect(
				doTransform(`
					function Hello() {
						function handleClick() {}
						return <h1 onClick={handleClick}>Hi</h1>;
					}
					function Bar() {
						return <Hello />;
					}
			`)
			).toMatchInlineSnapshot(`
			"var _c0, _c1;
			function Hello() {
									function handleClick() {}
									return <h1 onClick={handleClick}>Hi</h1>;
								}
			_c0 = Hello;
			function Bar() {
									return <Hello />;
								}
			_c1 = Bar;
			$RefreshReg$(_c0, 'Hello');
			$RefreshReg$(_c1, 'Bar');
			"
		`);
		});

		it('registers top-level exported function declarations', () => {
			expect(
				doTransform(`
					export function Hello() {
						function handleClick() {}
						return <h1 onClick={handleClick}>Hi</h1>;
					}
					export default function Bar() {
						return <Hello />;
					}
					function Baz() {
						return <h1>OK</h1>;
					}
					const NotAComp = 'hi';
					export { Baz, NotAComp };
					export function sum() {}
					export const Bad = 42;
			`)
			).toMatchInlineSnapshot(`
			"var _c0, _c1, _c2;
			export function Hello() {
									function handleClick() {}
									return <h1 onClick={handleClick}>Hi</h1>;
								}
			_c0 = Hello;
			export default function Bar() {
									return <Hello />;
								}
			_c1 = Bar;
			function Baz() {
									return <h1>OK</h1>;
								}
			_c2 = Baz;
			const NotAComp = 'hi';
			export {Baz, NotAComp};
			export function sum() {}
			export const Bad = 42;
			$RefreshReg$(_c0, 'Hello');
			$RefreshReg$(_c1, 'Bar');
			$RefreshReg$(_c2, 'Baz');
			"
		`);
		});

		it('uses original function declaration if it get reassigned', () => {
			expect(
				doTransform(`
					function Hello() {
						return <h1>Hi</h1>;
					}
					Hello = connect(Hello);
			`)
			).toMatchInlineSnapshot(`
			"var _c0;
			function Hello() {
									return <h1>Hi</h1>;
								}
			_c0 = Hello;
			Hello = connect(Hello);
			$RefreshReg$(_c0, 'Hello');
			"
		`);
		});

		it('preserves exports', () => {
			expect(
				doTransform(`
					export const A = forwardRef(function() {
						return <h1>Foo</h1>;
					});
			`)
			).toMatchInlineSnapshot(`
			"var _c0, _c1;
			export const A = forwardRef(_c0 = function () {
			  return <h1>Foo</h1>;
			});
			_c1 = A;
			$RefreshReg$(_c0, 'A$forwardRef');
			$RefreshReg$(_c1, 'A');
			"
		`);

			expect(
				doTransform(`
				export default forwardRef(function() {
					return <h1>Foo</h1>;
				});
		`)
			).toMatchInlineSnapshot(`
		"var _c0, _c1;
		export default _c1 = forwardRef(_c0 = function () {
			return <h1>Foo</h1>;
		});
		$RefreshReg$(_c0, '%default%$forwardRef');
		$RefreshReg$(_c1, '%default%');
		"
	`);
		});

		it('registers HOCs', () => {
			expect(
				doTransform(`
					const A = forwardRef(function() {
						return <h1>Foo</h1>;
					});
					const B = memo(forwardRef(() => {
						return <h1>Foo</h1>;
					}));
					export default memo(forwardRef((props, ref) => {
						return <h1>Foo</h1>;
					}));
			`)
			).toMatchInlineSnapshot(`
			"var _c0, _c1, _c2, _c3, _c4, _c5, _c6, _c7;
			const A = forwardRef(_c0 = function () {
			  return <h1>Foo</h1>;
			});
			_c1 = A;
			const B = memo(_c3 = forwardRef(_c2 = () => {
			  return <h1>Foo</h1>;
			}));
			_c4 = B;

			export default _c7 = React.memo(_c6 = forwardRef(_c5 = (props, ref) => {
				return <h1>Foo</h1>;
			}));

			$RefreshReg$(_c0, 'A$forwardRef');
			$RefreshReg$(_c1, 'A');
			$RefreshReg$(_c2, 'B$memo$forwardRef');
			$RefreshReg$(_c3, 'B$memo');
			$RefreshReg$(_c4, 'B');
			$RefreshReg$(_c5, '%default%$memo$forwardRef');
			$RefreshReg$(_c6, '%default%$memo');
			$RefreshReg$(_c7, '%default%');
			"
		`);
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
			}}</a>\`)}$\`;"
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
