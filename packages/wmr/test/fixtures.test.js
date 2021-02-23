import path from 'path';
import { promises as fs } from 'fs';
import { setupTest, teardown, loadFixture, runWmrFast, getOutput, get } from './test-helpers.js';
import { rollup } from 'rollup';
import nodeBuiltinsPlugin from '../src/plugins/node-builtins-plugin.js';

jest.setTimeout(30000);

describe('fixtures', () => {
	/** @type {TestEnv} */
	let env;
	/** @type {WmrInstance} */
	let instance;

	beforeEach(async () => {
		env = await setupTest();
	});

	afterEach(async () => {
		await teardown(env);
		instance.close();
	});

	it('should import absolute file', async () => {
		await loadFixture('import-absolute', env);
		instance = await runWmrFast(env.tmp.path);
		expect(await getOutput(env, instance)).toMatch(`foo`);
	});

	it('should import relative file', async () => {
		await loadFixture('import-relative', env);
		instance = await runWmrFast(env.tmp.path);
		expect(await getOutput(env, instance)).toMatch(`foo`);
	});

	it('should support class-fields', async () => {
		await loadFixture('class-fields', env);
		instance = await runWmrFast(env.tmp.path);
		expect(await getOutput(env, instance)).toMatch(`class fields work`);
	});

	it('should not if sub-import is not in export map', async () => {
		await loadFixture('empty', env);
		instance = await runWmrFast(env.tmp.path);
		await getOutput(env, instance);
		expect(
			await env.page.evaluate(async () => {
				const res = await fetch('/@npm/@urql/core');
				const body = await res.text();
				return { status: res.status, body };
			})
		).toEqual({
			status: 200,
			body: expect.stringMatching(/createClient/)
		});
		// Note: we can't assert on the exported values here because they're just Puppeteer Handle objects.
		expect(await env.page.evaluate(`import('/@npm/@urql/core')`)).toMatchObject({
			createClient: expect.anything(),
			Client: expect.anything()
		});
	});

	describe('empty', () => {
		it('should print warning for missing index.html file in public dir', async () => {
			await loadFixture('empty', env);
			instance = await runWmrFast(env.tmp.path);
			expect(instance.output.join('\n')).toMatch(`missing "index.html" file`);
			expect(await getOutput(env, instance)).toMatch(`Not Found`);
		});

		it('should print warning for missing index.html file (no public dir)', async () => {
			await loadFixture('empty-nopublic', env);
			instance = await runWmrFast(env.tmp.path);
			expect(instance.output.join('\n')).toMatch(`missing "index.html" file`);
			expect(await getOutput(env, instance)).toMatch(`Not Found`);
		});

		it('should start successfully with only an HTML file in public dir', async () => {
			await loadFixture('htmlonly', env);
			instance = await runWmrFast(env.tmp.path);
			expect(instance.output.join('\n')).not.toMatch(`missing an "index.html"`);
			expect(await getOutput(env, instance)).toMatch(`<h1>Hello wmr</h1>`);
		});

		it('should start successfully with only an HTML file (no public dir)', async () => {
			await loadFixture('htmlonly-nopublic', env);
			instance = await runWmrFast(env.tmp.path);
			expect(instance.output.join('\n')).not.toMatch(`missing an "index.html"`);
			expect(await getOutput(env, instance)).toMatch(`<h1>Hello wmr</h1>`);
		});
	});

	describe('client-side routing fallbacks', () => {
		it('should return index.html for missing navigate requests', async () => {
			await loadFixture('index-fallback', env);
			instance = await runWmrFast(env.tmp.path);

			await getOutput(env, instance);
			expect(await env.page.$eval('h1', el => el.textContent)).toBe('/');
			expect(await env.page.title()).toBe('index.html');

			await env.page.goto(`${await instance.address}/foo`, { waitUntil: 'networkidle0' });
			expect(await env.page.$eval('h1', el => el.textContent)).toBe('/foo');
			expect(await env.page.title()).toBe('index.html');

			expect(await env.page.evaluate(async () => (await fetch('/foo.js')).status)).toBe(404);
			expect(await env.page.evaluate(async () => await (await fetch('/foo.js')).text())).toMatch(/not found/i);
		});

		it('should use 200.html for fallback if present', async () => {
			await loadFixture('200', env);
			instance = await runWmrFast(env.tmp.path);

			await getOutput(env, instance);
			expect(await env.page.$eval('h1', el => el.textContent)).toBe('/');
			expect(await env.page.title()).toBe('index.html');

			await env.page.goto(`${await instance.address}/foo`, { waitUntil: 'networkidle0' });
			expect(await env.page.$eval('h1', el => el.textContent)).toBe('/foo');
			expect(await env.page.title()).toBe('200.html');
		});
	});

	describe('url: import prefix', () => {
		it('should return ?asset URLs in development', async () => {
			await loadFixture('url-prefix', env);
			instance = await runWmrFast(env.tmp.path);
			const output = await getOutput(env, instance);
			expect(output).toMatch(/<pre id="out">{.+}<\/pre>/);
			const json = JSON.parse(await env.page.$eval('#out', el => el.textContent || ''));
			expect(json).toHaveProperty('htmlUrl', '/index.html?asset');
			expect(json).toHaveProperty('selfUrl', '/index.js?asset');
			const out = await env.page.evaluate(async () => await (await fetch('/index.js?asset')).text());
			expect(out).toEqual(await fs.readFile(path.resolve(__dirname, 'fixtures/url-prefix/index.js'), 'utf-8'));
		});
	});

	describe('alias', () => {
		it('should allow specifying preact/compat alias', async () => {
			await loadFixture('alias', env);
			instance = await runWmrFast(env.tmp.path);
			const output = await getOutput(env, instance);
			expect(output).toMatch(/preact was used to render/);
			expect(await env.page.evaluate(`window.React === window.preactCompat`)).toBe(true);
			expect(await env.page.evaluate(`window.ReactDOM === window.preactCompat`)).toBe(true);
		});
	});

	describe('rmwc', () => {
		it('should run rmwc demo', async () => {
			await loadFixture('rmwc', env);
			instance = await runWmrFast(env.tmp.path);
			const output = await getOutput(env, instance);
			expect(output).toMatch(/Pizza/i);
			expect(await env.page.evaluate(`window.didRender`)).toBe(true);
		});

		it('should follow resolutions', async () => {
			await loadFixture('rmwc', env);
			const pkg = path.join(env.tmp.path, 'package.json');
			const pkgJson = JSON.parse(await fs.readFile(pkg, 'utf-8'));
			pkgJson.resolutions = {
				'@material/**': '^5.0.0'
			};
			await fs.writeFile(pkg, JSON.stringify(pkgJson, null, 2));
			instance = await runWmrFast(env.tmp.path);
			const output = await getOutput(env, instance);
			expect(output).toMatch(/Pizza/i);
			expect(await env.page.evaluate(`window.didRender`)).toBe(true);
		});
	});

	describe('external scripts', () => {
		it('should not transpile CJS', async () => {
			await loadFixture('external-scripts', env);
			instance = await runWmrFast(env.tmp.path);
			await getOutput(env, instance);
			expect(await env.page.$eval('h1', el => el.textContent)).toBe('EXTERNAL SCRIPT LOADED');
		});

		it('should use ?asset to bypass transforms', async () => {
			await loadFixture('external-scripts', env);
			instance = await runWmrFast(env.tmp.path);
			await getOutput(env, instance);
			expect(await env.page.$eval('h1', el => el.textContent)).toBe('EXTERNAL SCRIPT LOADED');
		});

		it('should allow unprocessed protocol-relative URL imports', async () => {
			await loadFixture('external-scripts', env);
			instance = await runWmrFast(env.tmp.path);
			await getOutput(env, instance);
			expect(await env.page.$eval('#external', el => el.textContent)).toBe('rendered from unpkg');
			expect(await env.page.evaluate(`window.unistore`)).toBeTruthy();
		});
	});

	describe('hmr', () => {
		async function updateFile(tempDir, file, replacer) {
			const compPath = path.join(tempDir, file);
			const content = await fs.readFile(compPath, 'utf-8');
			await fs.writeFile(compPath, replacer(content));
		}

		const timeout = n => new Promise(r => setTimeout(r, n));

		it('should hot reload the child-file', async () => {
			await loadFixture('hmr', env);
			instance = await runWmrFast(env.tmp.path);
			await getOutput(env, instance);

			const home = await env.page.$('.home');
			let text = home ? await home.evaluate(el => el.textContent) : null;
			expect(text).toEqual('Home');

			await updateFile(env.tmp.path, 'home.js', content =>
				content.replace('<p class="home">Home</p>', '<p class="home">Away</p>')
			);

			await timeout(1000);

			text = home ? await home.evaluate(el => el.textContent) : null;
			expect(text).toEqual('Away');
		});

		it('should hot reload for a newly created file', async () => {
			await loadFixture('hmr', env);
			instance = await runWmrFast(env.tmp.path);
			await getOutput(env, instance);

			const compPath = path.join(env.tmp.path, 'child.js');
			await fs.writeFile(compPath, `export default function Child() {return <p class="child">child</p>}`);

			const home = await env.page.$('.home');
			let text = home ? await home.evaluate(el => el.textContent) : null;
			expect(text).toEqual('Home');

			await updateFile(env.tmp.path, 'home.js', content => {
				content += `import Child from './child.js'
				${content}`;
				return content.replace('<p class="home">Home</p>', '<p class="home">Away</p>');
			});

			await timeout(1000);

			const child = await env.page.$('.child');
			text = child ? await child.evaluate(el => el.textContent) : null;
			expect(text).toEqual('child');
		});

		it('should hot reload the css-file', async () => {
			await loadFixture('hmr', env);
			instance = await runWmrFast(env.tmp.path);
			await getOutput(env, instance);

			expect(await page.$eval('main', e => getComputedStyle(e).color)).toBe('rgb(51, 51, 51)');

			await updateFile(env.tmp.path, 'style.module.js', content => content.replace('color: #333;', 'color: #000;'));

			await timeout(1000);

			expect(await page.$eval('main', e => getComputedStyle(e).color)).toBe('rgb(0, 0, 0)');
		});
	});

	describe('commonjs', () => {
		it('should transpile .cjs files', async () => {
			await loadFixture('commonjs', env);
			instance = await runWmrFast(env.tmp.path);
			await getOutput(env, instance);
			expect(await env.page.evaluate(`import('/foo.cjs')`)).toEqual({
				default: {
					a: 'one',
					b: 'two'
				}
			});
		});

		// NOTE: This test actually verifies an over-simplified version of CJS that is not ideal.
		// We will want to update these tests to assert that named exports are inferred once
		// WMR has been switched over to using cjs-module-lexer (#109).
		it('should pass smoke test', async () => {
			await loadFixture('commonjs', env);
			instance = await runWmrFast(env.tmp.path);
			await getOutput(env, instance);

			// import * as foo from './foo.cjs'
			expect(await env.page.$eval('#cjs', el => JSON.parse(el.textContent || 'null'))).toEqual({
				default: {
					a: 'one',
					b: 'two'
				}
			});

			// import foo from './foo.cjs'
			expect(await env.page.$eval('#cjsdefault', el => JSON.parse(el.textContent || 'null'))).toEqual({
				a: 'one',
				b: 'two'
			});

			// const foo = require('./esm.js')
			expect(await env.page.$eval('#cjsimport', el => JSON.parse(el.textContent || ''))).toEqual({
				default: 'default export',
				a: 1,
				b: 2
			});

			const imports = /** @type{object} */ (await env.page.evaluate(`import('/cjs-imports.cjs')`)).default;

			// requiring a CJS module with (`exports.a=..`) exports should return its named exports:
			expect(imports.namedCjs).toEqual({
				a: 1,
				b: 2
			});
			// requiring an ES module with only named exports should return its named exports:
			expect(imports.namedEsm).toEqual({
				a: 1,
				b: 2
			});

			// requiring a CJS module with `module.exports=..` exports should return that default export:
			expect(imports.defaultCjs).toEqual({
				a: 1,
				b: 2
			});
			// requiring an ES module with only a default export should return its default export:
			expect(imports.defaultEsm).toEqual({
				a: 1,
				b: 2
			});

			// requiring an ES module with both named+default exports should return its default export:
			expect(imports.mixedEsm).toEqual({
				default: 'default export',
				a: 1,
				b: 2
			});
			// requiring a CJS module with transpiled named+default exports should return its faux ModuleRecord:
			expect(imports.mixedCjs).toEqual({
				__esModule: true,
				default: 'default export',
				a: 1,
				b: 2
			});
		});
	});

	describe('process', () => {
		it('should support process.env.NODE_ENV', async () => {
			await loadFixture('process', env);
			instance = await runWmrFast(env.tmp.path);
			const output = await getOutput(env, instance);
			expect(output).toMatch(/development/i);
		});

		it('should import builtins:process.js', async () => {
			await loadFixture('process-import', env);
			instance = await runWmrFast(env.tmp.path);
			const output = await getOutput(env, instance);
			expect(output).toMatch(/development/i);
		});

		it('should import builtins:process.js #2', async () => {
			await loadFixture('process-import2', env);
			instance = await runWmrFast(env.tmp.path);
			const output = await getOutput(env, instance);
			expect(output).toMatch(/it works/i);
		});
	});

	describe('json', () => {
		it('should allow importing .json files', async () => {
			await loadFixture('json', env);
			instance = await runWmrFast(env.tmp.path);
			await env.page.goto(await instance.address);
			expect(await env.page.evaluate(`import('/index.js')`)).toEqual({
				default: {
					name: 'foo'
				}
			});
		});

		it('should handle "json:" import prefix', async () => {
			await loadFixture('json', env);
			instance = await runWmrFast(env.tmp.path);
			await env.page.goto(await instance.address);
			expect(await env.page.evaluate(`import('/using-prefix.js')`)).toEqual({
				default: {
					second: 'file',
					a: 42
				}
			});
		});
	});

	describe('implicit import of files as URLs', () => {
		it('importing a .jpg should produce its URL', async () => {
			await loadFixture('file-import', env);
			instance = await runWmrFast(env.tmp.path);
			const output = await getOutput(env, instance);
			expect(output).toMatch(/\/img\.jpg\?asset/i);

			const expected = await fs.readFile(path.resolve(__dirname, 'fixtures/file-import/fake-font.ttf'), 'utf-8');
			const served = await get(instance, '/fake-font.ttf');
			expect(served.body).toEqual(expected);
		});
	});

	describe('package-exports', () => {
		beforeEach(async () => {
			await loadFixture('package-exports', env);
			instance = await runWmrFast(env.tmp.path);
			await env.page.goto(await instance.address);
		});

		it('should support the "main" field (and no mainfield)', async () => {
			expect(await env.page.evaluate(`import('/@npm/main')`)).toEqual({
				default: 'main'
			});

			expect(await env.page.evaluate(`import('/@npm/no-mainfield')`)).toEqual({
				default: 'no-mainfield'
			});

			expect(await env.page.evaluate(`import('/@npm/no-mainfield-module')`)).toEqual({
				default: 'no-mainfield-module'
			});
		});

		it('should support the "exports" field', async () => {
			expect(await env.page.evaluate(`import('/@npm/exports-single')`)).toEqual({
				default: 'exports-single'
			});

			expect(await env.page.evaluate(`import('/@npm/exports-multi')`)).toEqual({
				default: 'exports-multi'
			});

			expect(await env.page.evaluate(`import('/@npm/exports-fallbacks-importfirst')`)).toEqual({
				default: 'import'
			});

			// We prioritize import/module/browser over require/default:
			expect(await env.page.evaluate(`import('/@npm/exports-fallbacks-requirefirst')`)).toEqual({
				default: 'import'
			});
			expect(await env.page.evaluate(`import('/@npm/exports-fallbacks-defaultfirst')`)).toEqual({
				default: 'import'
			});

			// When import/module/browser isn't present (but a random other one is!), we fall back to require/default:
			expect(await env.page.evaluate(`import('/@npm/exports-fallbacks-requirefallback')`)).toEqual({
				default: 'require'
			});
			expect(await env.page.evaluate(`import('/@npm/exports-fallbacks-defaultfallback')`)).toEqual({
				default: 'default'
			});
		});
	});

	describe('node built-ins', () => {
		it('should return an error if a node built-in is used in production', async () => {
			const error =
				'Could not load http (imported by test/fixtures/node-builtins/http.js): Error: http is a Node built-in - WMR does not polyfill these';

			await expect(
				rollup({
					input: 'test/fixtures/node-builtins/http.js',
					plugins: [nodeBuiltinsPlugin({ production: true })]
				})
			).rejects.toThrow(error);
		});

		it('should return an warning if a node built-in is used in development', async () => {
			const warning =
				`Warning: http is a Node built-in - WMR does not polyfill these.\n` +
				`For development the module has been stubbed.`;
			const warns = [];
			await rollup({
				input: 'test/fixtures/node-builtins/http.js',
				plugins: [nodeBuiltinsPlugin()],
				onwarn: warn => warns.push(warn)
			});
			expect(warns).toHaveLength(1);
			expect(warns[0].message.trim()).toEqual(warning.trim());
		});
	});
});
