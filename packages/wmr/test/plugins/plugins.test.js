import { getOutput, loadFixture, runWmrFast, setupTest, teardown, waitForMessage, withLog } from '../test-helpers.js';

jest.setTimeout(30000);

describe('config', () => {
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

	/* eslint-disable jest/expect-expect */
	describe('plugins', () => {
		it('should call custom hooks in right order', async () => {
			await loadFixture('plugin-hooks', env);
			instance = await runWmrFast(env.tmp.path);
			await instance.address;
			await withLog(instance.output, async () => {
				await waitForMessage(instance.output, /plugin-a/);

				// Check that config() was called before configResolved()
				const configHook = instance.output.findIndex(line => /plugin-a: config\(\)/.test(line));
				const configResolvedHook = instance.output.findIndex(line => /plugin-a: configResolved\(\)/.test(line));
				expect(configHook < configResolvedHook).toEqual(true);

				// Check that both "cwd" and "root" are correct
				expect(instance.output[configHook]).toMatch(/cwd:.*, root:.*\/public/);
				expect(instance.output[configResolvedHook]).toMatch(/cwd:.*, root:.*\/public/);
			});
		});

		it('should call outputOptions', async () => {
			await loadFixture('plugin-output-options', env);
			instance = await runWmrFast(env.tmp.path);
			await instance.address;
			await withLog(instance.output, async () => {
				await waitForMessage(instance.output, /OPTIONS format: esm/);
			});
		});

		it('should support `this.error()`', async () => {
			await loadFixture('plugin-error', env);
			instance = await runWmrFast(env.tmp.path);
			await getOutput(env, instance);
			await waitForMessage(instance.output, /oh no #1/);
			await waitForMessage(instance.output, /oh no #2/);
			await waitForMessage(instance.output, /oh no #3/);
		});
	});

	it('should allow calls to emitFile without name', async () => {
		await loadFixture('plugin-emit', env);
		instance = await runWmrFast(env.tmp.path);
		await getOutput(env, instance);
		await withLog(instance.output, async () => {
			await env.page.goto(await instance.address, { waitUntil: ['domcontentloaded', 'networkidle2'] });
			expect(await env.page.content()).toMatch(/it works/);
		});
	});

	it('should call config() and configResolved() of all plugins', async () => {
		await loadFixture('plugin-config-multiple', env);
		instance = await runWmrFast(env.tmp.path);
		await getOutput(env, instance);

		await waitForMessage(instance.output, 'config() A');
		await waitForMessage(instance.output, 'config() C');
		await waitForMessage(instance.output, 'configResolved() A');
		await waitForMessage(instance.output, 'configResolved() C');
	});
});
