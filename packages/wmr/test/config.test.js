import { loadFixture, runWmrFast, setupTest, teardown, waitForMessage } from './test-helpers.js';

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
	describe('defineConfig', () => {
		it('should support setting options via object arg', async () => {
			await loadFixture('define-config', env);
			instance = await runWmrFast(env.tmp.path);
			await instance.address;
			await waitForMessage(instance.output, /name: ["']foo["']/);
		});

		it('should support setting options via object arg (ts + esm)', async () => {
			await loadFixture('define-config-typescript', env);
			instance = await runWmrFast(env.tmp.path);
			await instance.address;
			await waitForMessage(instance.output, /name: ["']foo["']/);
		});

		it('should support setting options via object arg (ts + cjs)', async () => {
			await loadFixture('define-config-typescript-cjs', env);
			instance = await runWmrFast(env.tmp.path);
			await instance.address;
			await waitForMessage(instance.output, /name: ["']foo["']/);
		});

		it('should support setting options via function', async () => {
			await loadFixture('define-config-fn', env);
			instance = await runWmrFast(env.tmp.path);
			await instance.address;
			await waitForMessage(instance.output, /name: ["']foo["']/);
		});

		it('should support setting options via function return value', async () => {
			await loadFixture('define-config-fn-return', env);
			instance = await runWmrFast(env.tmp.path);
			await instance.address;
			await waitForMessage(instance.output, /name: ["']foo["']/);
		});

		it('should support setting conditional options via function', async () => {
			await loadFixture('define-config-fn-conditional', env);
			instance = await runWmrFast(env.tmp.path);
			await instance.address;
			await waitForMessage(instance.output, /name: ["']start["']/);
		});
	});
});
