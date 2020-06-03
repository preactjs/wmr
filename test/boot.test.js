import { setupTest, teardown, runWmr, loadFixture, waitForMessage } from './test-helpers';

jest.setTimeout(30000);

describe('boot', () => {
	/** @type {import('./test-helpers').TestEnv} */
	let env;
	/** @type {import('./test-helpers').WmrInstance} */
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
		instance = await runWmr('--cwd', env.tmp.path);
		await waitForMessage(instance.output, /^Listening/);

		expect(instance.output).toEqual(['Listening on http://localhost:8080', '  ⌙ http://192.168.2.107:8080']);
	});
});
