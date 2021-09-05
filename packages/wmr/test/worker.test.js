import path from 'path';
import {
	getOutput,
	loadFixture,
	runWmr,
	runWmrFast,
	serveStatic,
	setupTest,
	teardown,
	waitForMessage,
	waitForPass,
	withLog
} from './test-helpers.js';

jest.setTimeout(30000);

describe('Workers', () => {
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

		it('should load worker', async () => {
			await loadFixture('worker', env);
			instance = await runWmrFast(env.tmp.path);
			await getOutput(env, instance);

			await withLog(instance.output, async () => {
				await waitForPass(async () => {
					const h1 = await env.page.evaluate('document.querySelector("h1").textContent');
					const h2 = await env.page.evaluate('document.querySelector("h2").textContent');

					expect(h1).toMatch('it works');
					expect(h2).toMatch('it works');
				});
			});
		});

		it('should load multiple workers', async () => {
			await loadFixture('worker-multi', env);
			instance = await runWmrFast(env.tmp.path);
			await getOutput(env, instance);

			await withLog(instance.output, async () => {
				await waitForPass(async () => {
					const h1 = await env.page.evaluate('document.querySelector("h1").textContent');
					const h2 = await env.page.evaluate('document.querySelector("h2").textContent');

					expect(h1).toMatch('it works');
					expect(h2).toMatch('it works');
				});
			});
		});

		it('should support ESM workers', async () => {
			await loadFixture('worker-esm', env);
			instance = await runWmrFast(env.tmp.path);
			await getOutput(env, instance);

			await withLog(instance.output, async () => {
				await waitForPass(async () => {
					const h1 = await env.page.evaluate('document.querySelector("h1").textContent');
					const h2 = await env.page.evaluate('document.querySelector("h2").textContent');

					expect(h1).toMatch('it works');
					expect(h2).toMatch('it works');
				});

				await waitForMessage(instance.output, /Module workers are not widely supported/);
			});
		});

		it('should load worker in nested path', async () => {
			await loadFixture('worker-relative', env);
			instance = await runWmrFast(env.tmp.path);
			await getOutput(env, instance);

			await withLog(instance.output, async () => {
				await waitForPass(async () => {
					const h1 = await env.page.evaluate('document.querySelector("h1").textContent');
					expect(h1).toMatch('it works');
				});
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

		it('should load worker', async () => {
			await loadFixture('worker', env);
			instance = await runWmr(env.tmp.path, 'build');

			expect(await instance.done).toEqual(0);
			const { address, stop } = serveStatic(path.join(env.tmp.path, 'dist'));
			cleanup.push(stop);
			await env.page.goto(address, {
				waitUntil: ['networkidle0', 'load']
			});

			await withLog(instance.output, async () => {
				await waitForPass(async () => {
					const h1 = await env.page.evaluate('document.querySelector("h1").textContent');
					const h2 = await env.page.evaluate('document.querySelector("h2").textContent');

					expect(h1).toMatch('it works');
					expect(h2).toMatch('it works');
				});
			});
		});

		it('should load multiple workers', async () => {
			await loadFixture('worker-multi', env);
			instance = await runWmr(env.tmp.path, 'build');

			expect(await instance.done).toEqual(0);
			const { address, stop } = serveStatic(path.join(env.tmp.path, 'dist'));
			cleanup.push(stop);
			await env.page.goto(address, {
				waitUntil: ['networkidle0', 'load']
			});

			await withLog(instance.output, async () => {
				await waitForPass(async () => {
					const h1 = await env.page.evaluate('document.querySelector("h1").textContent');
					const h2 = await env.page.evaluate('document.querySelector("h2").textContent');

					expect(h1).toMatch('it works');
					expect(h2).toMatch('it works');
				});
			});
		});

		it('should load ESM workers', async () => {
			await loadFixture('worker-esm', env);
			instance = await runWmr(env.tmp.path, 'build');

			expect(await instance.done).toEqual(0);
			const { address, stop } = serveStatic(path.join(env.tmp.path, 'dist'));
			cleanup.push(stop);
			await env.page.goto(address, {
				waitUntil: ['networkidle0', 'load']
			});

			await withLog(instance.output, async () => {
				await waitForPass(async () => {
					const h1 = await env.page.evaluate('document.querySelector("h1").textContent');
					const h2 = await env.page.evaluate('document.querySelector("h2").textContent');

					expect(h1).toMatch('it works');
					expect(h2).toMatch('it works');
				});

				await waitForMessage(instance.output, /Module workers are not widely supported/);
			});
		});

		it('should load worker in nested path', async () => {
			await loadFixture('worker-relative', env);
			instance = await runWmr(env.tmp.path, 'build');

			expect(await instance.done).toEqual(0);
			const { address, stop } = serveStatic(path.join(env.tmp.path, 'dist'));
			cleanup.push(stop);
			await env.page.goto(address, {
				waitUntil: ['networkidle0', 'load']
			});

			await withLog(instance.output, async () => {
				await waitForPass(async () => {
					const h1 = await env.page.evaluate('document.querySelector("h1").textContent');
					expect(h1).toMatch('it works');
				});
			});
		});
	});
});
