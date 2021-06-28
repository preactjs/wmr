import { setupTest, teardown, loadFixture, runWmrFast, getOutput, withLog } from './test-helpers.js';

jest.setTimeout(30000);

describe('sourcemaps', () => {
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

	it('should import absolute file', async () => {
		await loadFixture('sourcemap-ts', env);
		instance = await runWmrFast(env.tmp.path, '--sourcemap');

		await withLog(instance.output, async () => {
			expect(await getOutput(env, instance)).toMatch(/it works/);
			expect(await env.page.evaluate('fetch("/index.ts.map").then(r => r.json())')).toEqual({
				file: './index.ts',
				mappings: 'AAAA;AACA;AACA;AACA;AACA;AACA;AACA;AACA;AACA;AACA',
				names: [],
				sources: ['./index.ts'],
				version: 3
			});
		});
	});
});
