import path from 'path';
import { promises as fs } from 'fs';
import {
	setupTest,
	teardown,
	loadFixture,
	runWmrFast,
	getOutput,
	get,
	waitForMessage,
	waitForNotMessage
} from './test-helpers.js';
import { rollup } from 'rollup';
import nodeBuiltinsPlugin from '../src/plugins/node-builtins-plugin.js';
import { supportsSearchParams } from '../src/lib/net-utils.js';

jest.setTimeout(30000);

async function updateFile(tempDir, file, replacer) {
	const compPath = path.join(tempDir, file);
	const content = await fs.readFile(compPath, 'utf-8');
	await fs.writeFile(compPath, replacer(content));
}

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
			await waitForMessage(instance.output, 'missing "index.html" file');
			expect(await getOutput(env, instance)).toMatch(`Not Found`);
		});

		it('should print warning for missing index.html file (no public dir)', async () => {
			await loadFixture('empty-nopublic', env);
			instance = await runWmrFast(env.tmp.path);
			await waitForMessage(instance.output, 'missing "index.html" file');
			expect(await getOutput(env, instance)).toMatch(`Not Found`);
		});

		it('should start successfully with only an HTML file in public dir', async () => {
			await loadFixture('htmlonly', env);
			instance = await runWmrFast(env.tmp.path);
			await waitForNotMessage(instance.output, `missing an "index.html"`);
			expect(await getOutput(env, instance)).toMatch(`<h1>Hello wmr</h1>`);
		});

		it('should start successfully with only an HTML file (no public dir)', async () => {
			await loadFixture('htmlonly-nopublic', env);
			instance = await runWmrFast(env.tmp.path);
			await waitForNotMessage(instance.output, `missing an "index.html"`);
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

		it('should bubble up updates in non-accepted files', async () => {
			await loadFixture('hmr', env);
			instance = await runWmrFast(env.tmp.path);
			await getOutput(env, instance);

			const count = await env.page.$('.count');
			let text = count ? await count.evaluate(el => el.textContent) : null;
			expect(text).toEqual('0');

			let increment = await env.page.$('.increment');
			await increment.click();
			text = count ? await count.evaluate(el => el.textContent) : null;
			expect(text).toEqual('1');

			await updateFile(env.tmp.path, 'useCounter.js', content =>
				content.replace('() => setCount(count + 1)', '() => setCount(count + 2)')
			);

			await timeout(2000);

			increment = await env.page.$('.increment');
			await increment.click();
			text = count ? await count.evaluate(el => el.textContent) : null;
			expect(text).toEqual('3');
		});

		it('should bubble up updates in non-accepted files with multiple parents', async () => {
			await loadFixture('hmr', env);
			instance = await runWmrFast(env.tmp.path);
			await getOutput(env, instance);

			let homeFoo = await env.page.$('#home-foo');
			let rootFoo = await env.page.$('#root-foo');
			let homeText = homeFoo ? await homeFoo.evaluate(el => el.textContent) : null;
			let rootText = rootFoo ? await rootFoo.evaluate(el => el.textContent) : null;
			expect(homeText).toEqual('42');
			expect(rootText).toEqual('42');

			await updateFile(env.tmp.path, 'store/index.js', content => content.replace('42', '43'));

			await timeout(2000);

			homeFoo = await env.page.$('#home-foo');
			rootFoo = await env.page.$('#root-foo');
			homeText = homeFoo ? await homeFoo.evaluate(el => el.textContent) : null;
			rootText = rootFoo ? await rootFoo.evaluate(el => el.textContent) : null;
			expect(homeText).toEqual('43');
			expect(rootText).toEqual('43');

			await updateFile(env.tmp.path, 'store/index.js', content => content.replace('43', '44'));

			await timeout(2000);

			homeFoo = await env.page.$('#home-foo');
			rootFoo = await env.page.$('#root-foo');
			homeText = homeFoo ? await homeFoo.evaluate(el => el.textContent) : null;
			rootText = rootFoo ? await rootFoo.evaluate(el => el.textContent) : null;
			expect(homeText).toEqual('44');
			expect(rootText).toEqual('44');
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
				const newContent = `import Child from './child.js';\n\n${content}`;
				return newContent.replace('<p class="home">Home</p>', '<Child />');
			});

			await timeout(1000);

			const child = await env.page.$('.child');
			text = child ? await child.evaluate(el => el.textContent) : null;
			expect(text).toEqual('child');
		});

		it('should hot reload a css-file imported from index.html', async () => {
			await loadFixture('hmr', env);
			instance = await runWmrFast(env.tmp.path);
			await getOutput(env, instance);

			expect(await page.$eval('body', e => getComputedStyle(e).color)).toBe('rgb(51, 51, 51)');

			await updateFile(env.tmp.path, 'index.css', content => content.replace('color: #333;', 'color: #000;'));

			await timeout(1000);

			expect(await page.$eval('body', e => getComputedStyle(e).color)).toBe('rgb(0, 0, 0)');
		});

		it('should hot reload a module css-file', async () => {
			await loadFixture('hmr', env);
			instance = await runWmrFast(env.tmp.path);
			await getOutput(env, instance);

			expect(await page.$eval('main', e => getComputedStyle(e).color)).toBe('rgb(51, 51, 51)');

			await updateFile(env.tmp.path, 'style.module.css', content => content.replace('color: #333;', 'color: #000;'));

			await timeout(1000);

			expect(await page.$eval('main', e => getComputedStyle(e).color)).toBe('rgb(0, 0, 0)');
		});
	});

	describe('hmr-scss', () => {
		const timeout = n => new Promise(r => setTimeout(r, n));

		it('should hot reload an scss-file imported from index.html', async () => {
			await loadFixture('hmr-scss', env);
			instance = await runWmrFast(env.tmp.path);
			await getOutput(env, instance);

			expect(await page.$eval('body', e => getComputedStyle(e).color)).toBe('rgb(51, 51, 51)');

			await updateFile(env.tmp.path, 'index.scss', content => content.replace('color: #333;', 'color: #000;'));

			await timeout(1000);

			expect(await page.$eval('body', e => getComputedStyle(e).color)).toBe('rgb(0, 0, 0)');
		});

		it('should hot reload an imported scss-file from another scss-file', async () => {
			await loadFixture('hmr-scss', env);
			instance = await runWmrFast(env.tmp.path);
			await getOutput(env, instance);

			expect(await page.$eval('main', e => getComputedStyle(e).color)).toBe('rgb(51, 51, 51)');

			await updateFile(env.tmp.path, 'home.scss', content => content.replace('color: #333;', 'color: #000;'));

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

	describe('export-map', () => {
		beforeEach(async () => {
			await loadFixture('exports', env);
			instance = await runWmrFast(env.tmp.path);
			await env.page.goto(await instance.address);
		});

		it('should not pick node for a browser', async () => {
			const test = await env.page.$('.test');
			let text = test ? await test.evaluate(el => el.textContent) : null;
			expect(text).toEqual('Browser implementation');
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
				default: 'default'
			});

			// When import/module/browser isn't present (but a random other one is!), we fall back to require/default:
			expect(await env.page.evaluate(`import('/@npm/exports-fallbacks-requirefallback')`)).toEqual({
				default: 'default'
			});
			expect(await env.page.evaluate(`import('/@npm/exports-fallbacks-defaultfallback')`)).toEqual({
				default: 'default'
			});
		});
	});

	describe('config', () => {
		it('should support loading node built-ins', async () => {
			await loadFixture('config-node-builtins', env);
			instance = await runWmrFast(env.tmp.path);

			await waitForMessage(instance.output, /foo\/bar/);
			await waitForMessage(instance.output, /plugin-A/);
			expect(true).toEqual(true); // Silence linter
		});

		it('should restart server if config file changes', async () => {
			if (!supportsSearchParams) return;

			await loadFixture('config-reload', env);
			instance = await runWmrFast(env.tmp.path);
			await instance.address;
			await waitForMessage(instance.output, 'watching for config changes');

			// Trigger file change
			await updateFile(env.tmp.path, 'wmr.config.mjs', content => content.replace(/foo/g, 'bar'));

			await waitForMessage(instance.output, /restarting server/);
			await waitForMessage(instance.output, /{ name: 'bar' }/);
			expect(true).toEqual(true); // Silence linter
		});

		it('should restart server if .env file changes', async () => {
			if (!supportsSearchParams) return;

			await loadFixture('config-reload-env', env);
			instance = await runWmrFast(env.tmp.path);
			await instance.address;
			await waitForMessage(instance.output, 'watching for config changes');

			// Trigger file change
			await updateFile(env.tmp.path, '.env', content => content.replace(/foo/g, 'bar'));

			await waitForMessage(instance.output, /restarting server/);
			await waitForMessage(instance.output, /{ FOO: 'bar' }/);
			expect(true).toEqual(true); // Silence linter
		});

		it('should restart server if package.json file changes', async () => {
			if (!supportsSearchParams) return;

			await loadFixture('config-reload-package-json', env);
			instance = await runWmrFast(env.tmp.path);
			await instance.address;
			await waitForMessage(instance.output, 'watching for config changes');

			// Trigger file change
			await updateFile(env.tmp.path, 'package.json', content => {
				const json = JSON.parse(content);
				json.alias = { foo: 'bar' };
				return JSON.stringify(json);
			});

			await waitForMessage(instance.output, /restarting server/);
			await waitForMessage(instance.output, /{ foo: 'bar' }/);
			expect(true).toEqual(true); // Silence linter
		});

		it('should reconnect client on server restart', async () => {
			if (!supportsSearchParams) return;

			await loadFixture('config-reload-client', env);
			instance = await runWmrFast(env.tmp.path);
			await env.page.goto(await instance.address);
			await waitForMessage(instance.output, 'watching for config changes');

			const logs = [];
			env.page.on('console', m => logs.push(m.text()));

			// Trigger file change
			await updateFile(env.tmp.path, 'wmr.config.mjs', content => content.replace(/foo/, 'bar'));
			await waitForMessage(instance.output, /restarting server/);

			await waitForMessage(logs, /Connected to server/i);

			await updateFile(env.tmp.path, 'index.js', content => content.replace('Hello world', 'foo'));

			await env.page.waitForFunction(() => {
				const h1 = document.querySelector('h1');
				if (!h1 || !h1.textContent) return false;
				return h1.textContent.includes('foo');
			});

			expect(await env.page.content()).toMatch('foo 42');
		});
	});

	describe('plugins', () => {
		it('should order by plugin.enforce value', async () => {
			await loadFixture('plugin-enforce', env);
			instance = await runWmrFast(env.tmp.path);
			await env.page.goto(await instance.address);
			const text = await env.page.evaluate(`document.getElementById('app').textContent`);
			expect(text).toEqual('file pre1 pre2 normal1 normal2 post1 post2');
		});

		it('should support config() and configResolved() hooks', async () => {
			await loadFixture('plugin-config', env);
			instance = await runWmrFast(env.tmp.path);
			await env.page.goto(await instance.address);
			expect(await env.page.evaluate(`fetch('/test').then(r => r.text())`)).toEqual('it works');
			expect(await env.page.evaluate(`fetch('/test-resolved').then(r => r.text())`)).toEqual('it works');
		});

		it('should add middlewares via config', async () => {
			await loadFixture('plugin-middlewares', env);
			instance = await runWmrFast(env.tmp.path);
			await env.page.goto(await instance.address);
			const text = await env.page.evaluate(`fetch('/test').then(r => r.text())`);
			expect(text).toEqual('it works');
		});

		it.todo('should work with custom load hooks', async () => {
			await loadFixture('plugin-absolute-load', env);
			instance = await runWmrFast(env.tmp.path);
			await env.page.goto(await instance.address, { waitUntil: 'networkidle0' });
			const text = await env.page.content();
			expect(text).toMatch('foobarbaz');
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
