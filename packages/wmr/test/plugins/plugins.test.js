import { loadFixture, runWmrFast, setupTest, teardown, waitForMessage, withLog } from '../test-helpers.js';

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
	});
});
