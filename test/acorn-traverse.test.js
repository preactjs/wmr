import path from 'path';
import { readdirSync, promises as fs } from 'fs';
import { dent } from './test-helpers.js';
import * as acorn from 'acorn';
import acornJsx from 'acorn-jsx';
import { transform } from '../src/lib/acorn-traverse.js';
import transformJsxToHtm from 'babel-plugin-transform-jsx-to-htm';
// import transformJsxToHtmLite from '../src/lib/transform-jsx-to-htm-lite.js';

const Parser = acorn.Parser.extend(acornJsx());
const parse = (code, opts) => Parser.parse(code, { ecmaVersion: 2020, sourceType: 'module', ...opts });

/** @typedef {import('../src/lib/acorn-traverse.js').Plugin} Plugin */

/**
 * Transform source code using a Babel plugin
 * @param {string} code
 * @param {Plugin} plugin
 */
function transformWithPlugin(code, plugin) {
	return transform(code, {
		parse,
		plugins: [plugin]
	}).code;
}

/**
 * Create a transform() that runs the given bare Babel visitor
 * @param {(t: Parameters<Plugin>[0]['types']) => ReturnType<Plugin>['visitor']} visitor
 */
const withVisitor = visitor => code => transformWithPlugin(code, api => ({ name: '', visitor: visitor(api.types) }));

describe('acorn-traverse', () => {
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

				expect(doTransform('<>${x.map(a => <a>{a}</a>)}</>;')).toMatchInlineSnapshot(
					`"html\`$\${x.map((a) => html\`<a>\${a}</a>\`)}\`;"`
				);

				expect(doTransform('<>${x.map(([a,b,c]) => <a>{{a,b,c}}</a>)}</>;')).toMatchInlineSnapshot(
					`"html\`$\${x.map(([a,b,c]) => html\`<a>\${{a,b,c}}</a>\`)}\`;"`
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
							\${y.map(([k,v]) => html\`<li>
									\${k}: \${v}
								</li>\`)}
						\`
					);"
				`);
			});
		});
	});

	describe('fixtures', () => {
		const fixtures = path.join(__dirname, 'fixtures/_unit');
		const cases = readdirSync(fixtures).filter(f => f[0] !== '.');
		it.each(cases.filter(f => f.match(/\.expected/)))('fixtures', async expectedFile => {
			const expected = await fs.readFile(path.join(fixtures, expectedFile), 'utf-8');
			const source = await fs.readFile(path.join(fixtures, expectedFile.replace('.expected', '')), 'utf-8');
			const actual = transformWithPlugin(source, transformJsxToHtm);
			expect(actual).toEqual(expected);
		});
	});
});
