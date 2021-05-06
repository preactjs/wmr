import path from 'path';
import {
	setupTest,
	teardown,
	loadFixture,
	runWmrFast,
	getOutput,
	runWmr,
	serveStatic,
	withLog
} from '../test-helpers.js';

jest.setTimeout(30000);

describe('directory-plugin', () => {
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

	describe('development', () => {
		it('should import directories', async () => {
			await loadFixture('directory-import', env);
			instance = await runWmrFast(env.tmp.path);
			const output = await getOutput(env, instance);
			expect(output).toMatch(/a\.js.*b\.js.*c\.js/);
		});

		it('should throw when the target is not a directory', async () => {
			await loadFixture('directory-import', env);
			instance = await runWmrFast(env.tmp.path);
			await getOutput(env, instance);

			const res = await env.page.evaluate(`import('./invalid.js').then(() => true).catch(() => false)`);
			expect(res).toEqual(false);
		});
	});

	describe('production', () => {
		it('should import directories', async () => {
			await loadFixture('directory-import', env);
			instance = await runWmr(env.tmp.path, 'build');
			await withLog(instance.output, async () => {
				const code = await instance.done;
				expect(code).toEqual(0);

				const { address, stop } = serveStatic(path.join(env.tmp.path, 'dist'));
				cleanup.push(stop);

				await env.page.goto(address, {
					waitUntil: ['networkidle0', 'load']
				});

				const text = await env.page.content();
				expect(text).toMatch(/a\.js.*b\.js.*c\.js/);
			});
		});

		it('should throw when the target is not a directory', async () => {
			await loadFixture('directory-import', env);
			instance = await runWmr(env.tmp.path, 'build');
			await withLog(instance.output, async () => {
				const code = await instance.done;
				expect(code).toEqual(0);

				const { address, stop } = serveStatic(path.join(env.tmp.path, 'dist'));
				cleanup.push(stop);

				await env.page.goto(address, {
					waitUntil: ['networkidle0', 'load']
				});

				const res = await env.page.evaluate(`import('./invalid.js').then(() => true).catch(() => false)`);
				expect(res).toEqual(false);
			});
		});
	});
});
