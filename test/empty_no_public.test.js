import { setupTest, runWmr, openWmr } from './test-helpers.js';
import expect from 'expect';

export const description = 'should start successfully with only an HTML file (no public dir)';

/**
 * @param {import('pentf/runner').TaskConfig} config
 */
export async function run(config) {
	const env = await setupTest(config, 'htmlonly-nopublic', { open: false });

	const instance = await runWmr(config, env.tmp.path);
	expect(instance.output[0]).not.toMatch(`missing an "index.html"`);

	const page = await openWmr(config, instance);
	expect(await page.content()).toMatch('<h1>Hello wmr</h1>');
}
