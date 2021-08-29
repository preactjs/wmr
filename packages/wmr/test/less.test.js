import path from 'path';
import { promises as fs } from 'fs';
import {
	getOutput,
	loadFixture,
	runWmr,
	runWmrFast,
	serveStatic,
	setupTest,
	teardown,
	updateFile,
	waitForMessage,
	waitForPass,
	withLog
} from './test-helpers.js';

jest.setTimeout(30000);

describe('Less', () => {
	describe('development', () => {
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

		// eslint-disable-next-line jest/expect-expect
		it("should throw when a less compiler can't be found", async () => {
			await loadFixture('css-less', env);
			instance = await runWmrFast(env.tmp.path, { env: { DISABLE_LESS: 'true' } });
			await getOutput(env, instance);

			await withLog(instance.output, async () => {
				await waitForMessage(instance.output, /Please install less/);
			});
		});

		it('should transform less files', async () => {
			await loadFixture('css-less', env);
			instance = await runWmrFast(env.tmp.path);
			await getOutput(env, instance);

			await withLog(instance.output, async () => {
				await waitForPass(async () => {
					expect(await env.page.$eval('h1', el => getComputedStyle(el).color)).toMatch(/rgb\(255, 0, 0\)/);
				});
			});
		});

		it('should transform less modules', async () => {
			await loadFixture('css-less-module', env);
			instance = await runWmrFast(env.tmp.path);
			await getOutput(env, instance);

			await withLog(instance.output, async () => {
				expect(await env.page.$eval('h1', el => getComputedStyle(el).color)).toMatch(/rgb\(255, 0, 0\)/);
			});
		});

		it('should transform aliased imports modules', async () => {
			await loadFixture('css-less-alias', env);
			instance = await runWmrFast(env.tmp.path);
			await getOutput(env, instance);

			await withLog(instance.output, async () => {
				expect(await env.page.$eval('h1', el => getComputedStyle(el).color)).toMatch(/rgb\(255, 0, 0\)/);
			});
		});

		it('should not crash on non-existing files', async () => {
			await loadFixture('css-less-file-error', env);
			instance = await runWmrFast(env.tmp.path);
			await getOutput(env, instance);

			await withLog(instance.output, async () => {
				await waitForPass(async () => {
					expect(instance.output.join('\n')).toMatch(/'non-existing.less' wasn't found./);
				});
			});
		});

		it('should catch resolve error', async () => {
			await loadFixture('css-less-resolve-error', env);
			instance = await runWmrFast(env.tmp.path);
			await getOutput(env, instance);

			await withLog(instance.output, async () => {
				await waitForPass(async () => {
					expect(instance.output.join('\n')).toMatch(/500 \.\/public\/style.less - 'bar' wasn't found/);
				});
			});
		});

		it('should resolve nested alias import', async () => {
			await loadFixture('css-less-nested-alias', env);
			instance = await runWmrFast(env.tmp.path);
			await getOutput(env, instance);

			await withLog(instance.output, async () => {
				expect(await env.page.$eval('h1', el => getComputedStyle(el).color)).toMatch(/rgb\(255, 0, 0\)/);
			});
		});

		it('should resolve js-style relative alias import', async () => {
			await loadFixture('css-less-alias-relative', env);
			instance = await runWmrFast(env.tmp.path);
			await getOutput(env, instance);

			await withLog(instance.output, async () => {
				expect(await env.page.$eval('h1', el => getComputedStyle(el).color)).toMatch(/rgb\(255, 0, 0\)/);
			});
		});

		it('should resolve absolute imports', async () => {
			await loadFixture('css-less-absolute', env);
			instance = await runWmrFast(env.tmp.path);
			await getOutput(env, instance);

			await withLog(instance.output, async () => {
				expect(await env.page.$eval('h1', el => getComputedStyle(el).color)).toMatch(/rgb\(255, 0, 0\)/);
			});
		});
	});

	describe('production', () => {
		/** @type {TestEnv} */
		let env;
		/** @type {WmrInstance} */
		let instance;
		/** @type {(()=>void)[]} */
		let cleanup = [];

		beforeEach(async () => {
			env = await setupTest();
		});

		afterEach(async () => {
			await teardown(env);
			instance.close();
			await Promise.all(cleanup.map(c => Promise.resolve().then(c)));
			cleanup.length = 0;
		});

		it('should pick up less from the html file', async () => {
			await loadFixture('css-less-html', env);
			instance = await runWmr(env.tmp.path, 'build');

			const code = await instance.done;
			const dir = await fs.readdir(path.join(env.tmp.path, 'dist', 'assets'));
			expect(dir.some(x => x.endsWith('.css'))).toBeTruthy();
			expect(code).toEqual(0);
			const { address, stop } = serveStatic(path.join(env.tmp.path, 'dist'));
			cleanup.push(stop);
			await env.page.goto(address, {
				waitUntil: ['networkidle0', 'load']
			});
			expect(await env.page.$eval('div', el => getComputedStyle(el).color)).toBe('rgb(255, 0, 0)');
		});

		it('should correctly hash imported files', async () => {
			await loadFixture('css-less-import-hash', env);
			instance = await runWmr(env.tmp.path, 'build');

			await instance.done;
			const dir = await fs.readdir(path.join(env.tmp.path, 'dist'));
			const [cssFile] = await fs.readdir(path.join(env.tmp.path, 'dist', 'assets'));
			expect(dir.some(x => x.endsWith('.css'))).toBeFalsy();
			const hash = cssFile.split('.')[1];

			await updateFile(path.join(env.tmp.path, 'public'), '2.less', content => content.replace('green', 'red'));
			instance = await runWmr(env.tmp.path, 'build');
			await instance.done;
			const [newCssFile] = await fs.readdir(path.join(env.tmp.path, 'dist', 'assets'));
			const newHash = newCssFile.split('.')[1];

			expect(hash === newHash).toBeFalsy();
		});

		it('should correctly hash imported files from html', async () => {
			await loadFixture('css-less-import-hash-html', env);
			instance = await runWmr(env.tmp.path, 'build');

			await instance.done;
			const dir = await fs.readdir(path.join(env.tmp.path, 'dist'));
			const [cssFile] = await fs.readdir(path.join(env.tmp.path, 'dist', 'assets'));
			expect(dir.some(x => x.endsWith('.css'))).toBeFalsy();
			const hash = cssFile.split('.')[1];

			await updateFile(path.join(env.tmp.path, 'public'), '2.less', content => content.replace('green', 'red'));
			instance = await runWmr(env.tmp.path, 'build');
			await instance.done;
			const [newCssFile] = await fs.readdir(path.join(env.tmp.path, 'dist', 'assets'));
			const newHash = newCssFile.split('.')[1];

			expect(hash === newHash).toBeFalsy();
		});
	});
});
