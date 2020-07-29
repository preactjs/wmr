import path from 'path';
import { promises as fs } from 'fs';
import { setupTest, teardown, runWmr, loadFixture, waitForMessage } from './test-helpers.js';

jest.setTimeout(30000);

const addrs = new WeakMap();

async function getOutput(env, instance) {
	let address = addrs.get(instance);
	if (!address) {
		await waitForMessage(instance.output, /^Listening/);
		address = instance.output.join('\n').match(/https?:\/\/localhost:\d+/g)[0];
		addrs.set(instance, address);
	}

	await env.page.goto(address);
	return await env.page.content();
}

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
		await loadFixture('htmlonly', env);
		instance = await runWmr(env.tmp.path);

		// await waitForMessage(instance.output, /^Listening/);

		// const address = instance.output.join('\n').match(/https?:\/\/localhost:\d+/g)[0];

		// await env.page.goto(address);

		// expect(await env.page.content()).toMatch(`<h1>Hello wmr</h1>`);

		const content = await getOutput(env, instance);
		expect(content).toMatch(`<h1>Hello wmr</h1>`);
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

	describe('empty', () => {
		it('should print warning for missing index.html file in public dir', async () => {
			await loadFixture('empty', env);
			instance = await runWmr(env.tmp.path);
			expect(instance.output[0]).toMatch(`missing "index.html" file`);
			expect(await getOutput(env, instance)).toMatch(`Not Found`);
		});

		it('should print warning for missing index.html file (no public dir)', async () => {
			await loadFixture('empty-nopublic', env);
			instance = await runWmr(env.tmp.path);
			expect(instance.output[0]).toMatch(`missing "index.html" file`);
			expect(await getOutput(env, instance)).toMatch(`Not Found`);
		});

		it('should start successfully with only an HTML file in public dir', async () => {
			await loadFixture('htmlonly', env);
			instance = await runWmr(env.tmp.path);
			expect(instance.output[0]).not.toMatch(`missing an "index.html"`);
			expect(await getOutput(env, instance)).toMatch(`<h1>Hello wmr</h1>`);
		});

		it('should start successfully with only an HTML file (no public dir)', async () => {
			await loadFixture('htmlonly-nopublic', env);
			instance = await runWmr(env.tmp.path);
			expect(instance.output[0]).not.toMatch(`missing an "index.html"`);
			expect(await getOutput(env, instance)).toMatch(`<h1>Hello wmr</h1>`);
		});
	});
});
