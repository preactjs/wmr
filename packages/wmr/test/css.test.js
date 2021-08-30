import {
	getOutput,
	loadFixture,
	runWmrFast,
	setupTest,
	teardown,
	updateFile,
	waitForMessage,
	waitForPass,
	withLog
} from './test-helpers.js';
import path from 'path';

jest.setTimeout(30000);

describe('CSS', () => {
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

	it('should load referenced files via @import', async () => {
		await loadFixture('css-imports', env);
		instance = await runWmrFast(env.tmp.path);
		await getOutput(env, instance);

		await withLog(instance.output, async () => {
			expect(await env.page.$eval('h1', el => getComputedStyle(el).color)).toBe('rgb(255, 0, 0)');
		});
	});

	it('should load referenced files via url()', async () => {
		await loadFixture('css-imports', env);
		instance = await runWmrFast(env.tmp.path);
		await getOutput(env, instance);
		expect(await env.page.$eval('body', el => getComputedStyle(el).backgroundImage)).toMatch(/img\.jpg/);
	});

	describe('CSS Modules', () => {
		it('should hot reload a module css-file', async () => {
			await loadFixture('hmr', env);
			instance = await runWmrFast(env.tmp.path);
			await getOutput(env, instance);

			expect(await page.$eval('main', e => getComputedStyle(e).color)).toBe('rgb(51, 51, 51)');

			await updateFile(env.tmp.path, 'style.module.css', content => content.replace('color: #333;', 'color: #000;'));

			await waitForPass(async () => {
				expect(await page.$eval('main', e => getComputedStyle(e).color)).toBe('rgb(0, 0, 0)');
			});
		});

		it('should hot reload a module css-file when new class is added', async () => {
			await loadFixture('css-module-hmr', env);
			instance = await runWmrFast(env.tmp.path);
			await getOutput(env, instance);

			await withLog(instance.output, async () => {
				const h1 = await page.$('h1');
				expect(await env.page.evaluate(e => getComputedStyle(e).color, h1)).toBe('rgb(0, 0, 0)');

				await updateFile(env.tmp.path, 'styles/foo.module.css', () => `.foo { color: red; }`);

				await waitForPass(async () => {
					expect(await env.page.evaluate(e => getComputedStyle(e).color, h1)).toBe('rgb(255, 0, 0)');
				});
			});
		});

		it('should warn on CSS modules with reserved class names', async () => {
			await loadFixture('css-module-reserved', env);
			instance = await runWmrFast(env.tmp.path);
			await getOutput(env, instance);

			await waitForPass(async () => {
				expect(await env.page.$eval('.foo', el => getComputedStyle(el).backgroundColor)).toBe('rgb(255, 218, 185)');
				expect(await env.page.$eval('.new', el => getComputedStyle(el).backgroundColor)).toBe('rgb(255, 255, 0)');
				expect(await env.page.$eval('.debugger', el => getComputedStyle(el).backgroundColor)).toBe('rgb(255, 0, 0)');
				expect(await env.page.$eval('.const', el => getComputedStyle(el).backgroundColor)).toBe('rgb(255, 218, 185)');
			});

			expect(instance.output.join('\n')).toMatch(/Cannot use reserved word/);
		});

		// eslint-disable-next-line jest/expect-expect
		it('should warn on composes keyword being used in non CSS module context', async () => {
			await loadFixture('css-module-compose-warn', env);
			instance = await runWmrFast(env.tmp.path);
			await getOutput(env, instance);
			await waitForMessage(instance.output, /Warning: ICSS/);
		});

		it('should not overwrite style files', async () => {
			await loadFixture('css-module-clash', env);
			instance = await runWmrFast(env.tmp.path);
			await getOutput(env, instance);

			await withLog(instance.output, async () => {
				await waitForPass(async () => {
					expect(await env.page.$eval('#foo', el => getComputedStyle(el).color)).toBe('rgb(0, 0, 255)');
					expect(await env.page.$eval('#bar', el => getComputedStyle(el).color)).toBe('rgb(255, 0, 0)');
				});
			});
		});
	});

	describe('HMR', () => {
		it('should hot reload a css-file imported from index.html', async () => {
			await loadFixture('hmr', env);
			instance = await runWmrFast(env.tmp.path);
			await getOutput(env, instance);

			expect(await page.$eval('body', e => getComputedStyle(e).color)).toBe('rgb(51, 51, 51)');

			await updateFile(env.tmp.path, 'index.css', content => content.replace('color: #333;', 'color: #000;'));

			await waitForPass(async () => {
				expect(await page.$eval('body', e => getComputedStyle(e).color)).toBe('rgb(0, 0, 0)');
			});
		});

		it('should hot reload a nested css-file', async () => {
			await loadFixture('hmr-css', env);
			instance = await runWmrFast(env.tmp.path);
			await getOutput(env, instance);

			await withLog(instance.output, async () => {
				expect(await page.$eval('h1', e => getComputedStyle(e).color)).toBe('rgb(51, 51, 51)');

				await updateFile(env.tmp.path, path.join('public', 'home.css'), content =>
					content.replace('color: #333;', 'color: red;')
				);

				await waitForPass(async () => {
					expect(await page.$eval('h1', e => getComputedStyle(e).color)).toBe('rgb(255, 0, 0)');
				});
			});
		});

		it('should hot reload a nested css-file with no public folder', async () => {
			await loadFixture('hmr-css-no-public', env);
			instance = await runWmrFast(env.tmp.path);
			await getOutput(env, instance);

			await withLog(instance.output, async () => {
				expect(await page.$eval('h1', e => getComputedStyle(e).color)).toBe('rgb(51, 51, 51)');

				await updateFile(env.tmp.path, 'home.css', content => content.replace('color: #333;', 'color: red;'));

				await waitForPass(async () => {
					expect(await page.$eval('h1', e => getComputedStyle(e).color)).toBe('rgb(255, 0, 0)');
				});
			});
		});

		it('should not overwrite style files on HMR', async () => {
			await loadFixture('css-module-clash', env);
			instance = await runWmrFast(env.tmp.path);
			await getOutput(env, instance);

			await withLog(instance.output, async () => {
				await waitForPass(async () => {
					expect(await env.page.$eval('#foo', el => getComputedStyle(el).color)).toBe('rgb(0, 0, 255)');
					expect(await env.page.$eval('#bar', el => getComputedStyle(el).color)).toBe('rgb(255, 0, 0)');
				});

				await updateFile(env.tmp.path, path.join('public', 'foo', 'styles.module.css'), content =>
					content.replace('color: blue;', 'color: peachpuff;')
				);

				await waitForPass(async () => {
					expect(await env.page.$eval('#foo', el => getComputedStyle(el).color)).toBe('rgb(255, 218, 185)');
					expect(await env.page.$eval('#bar', el => getComputedStyle(el).color)).toBe('rgb(255, 0, 0)');
				});
			});
		});
	});
});
