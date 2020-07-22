import path from 'path';
import { promises as fs } from 'fs';
import { setupTest, teardown, runWmr, loadFixture, waitForMessage } from './test-helpers.js';

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

	it('should error without an index.html file', async () => {
		await loadFixture('erroneous', env);
		instance = await runWmr(env.tmp.path);
		expect(instance.output[0]).toMatch(/You are missing an "index.html" file/);
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
		await loadFixture('simple', env);
		instance = await runWmr(env.tmp.path, 'build');

		await waitForMessage(instance.output, /Wrote/);

		const files = await fs.readdir(env.tmp.path);
		expect(files).toEqual(['dist', 'public']);

		const dist = await fs.readdir(path.join(env.tmp.path, 'dist'));
		expect(dist).toContainEqual(expect.stringMatching(/^index\.[a-z0-9]+\.js$/));
	});
});
