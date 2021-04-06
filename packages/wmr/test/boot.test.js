import path from 'path';
import { promises as fs } from 'fs';
import { setupTest, teardown, runWmr, loadFixture, waitForMessage, getOutput, runWmrFast } from './test-helpers.js';

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
		await waitForMessage(instance.output, /(server running at|^Error)/);

		const output = instance.output.join('\n');

		expect(output).not.toMatch(/^Error/m);

		expect(output).toMatch(/server running at/);
		expect(output).toMatch(/Local:\s+http:\/\/localhost:\d+/);
	});

	it('should build simple HTML pages', async () => {
		await loadFixture('htmlonly', env);
		instance = await runWmr(env.tmp.path);

		const content = await getOutput(env, instance);
		expect(content).toMatch(`<h1>Hello wmr</h1>`);
	});

	it('should build', async () => {
		await loadFixture('simple', env);
		instance = await runWmrFast(env.tmp.path, 'build');

		await waitForMessage(instance.output, /Wrote/);

		const files = (await fs.readdir(env.tmp.path)).filter(file => !file.startsWith('.env'));
		expect(files).toEqual(['dist', 'public']);

		const dist = await fs.readdir(path.join(env.tmp.path, 'dist'));
		expect(dist).toContainEqual(expect.stringMatching(/^index\.[a-z0-9]+\.js$/));
	});
});
