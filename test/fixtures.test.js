import { setupTest, teardown, runWmr, loadFixture, waitForMessage } from './test-helpers';

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

	it('should listen on port', async () => {
		await loadFixture('empty', env);
		instance = await runWmr(env.tmp.path);
		await waitForMessage(instance.output, /^Listening/);

		const address = instance.output.join('\n').match(/https?:\/\/localhost:\d+/g)[0];

		await env.page.goto(address);

		expect(await env.page.content()).toMatch(`<h1>Hello wmr</h1>`);
	});

	it('should build', async () => {
		await loadFixture('empty', env);
		await runWmr(env.tmp.path, 'build');

		expect(true).toBe(true);
	});
});
