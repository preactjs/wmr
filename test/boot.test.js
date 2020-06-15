import { setupTest, teardown, runWmr, loadFixture, waitForMessage } from './test-helpers';

jest.setTimeout(30000);

describe('boot', () => {
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

	it('should listen on port', async () => {
		await loadFixture('simple', env);
		instance = await runWmr(env.tmp.path);
		await waitForMessage(instance.output, /(^Listening|Error:)/);

		const output = instance.output.join('\n');

		expect(output).not.toMatch(/Error:/);

		expect(output).toMatch(/Listening on http:\/\/localhost:\d+/);
		expect(output).toMatch(/⌙ http:\/\/\d+.\d+.\d+.\d+:\d+/);
	});
});
