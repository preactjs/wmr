import { setupTest, runWmr, openWmr } from './test-helpers.js';
import { closePage } from 'pentf/browser_utils';
import expect from 'expect';

export const description = 'should load html';

/**
 * @param {import('pentf/runner').TaskConfig} config
 */
export async function run(config) {
	const env = await setupTest(config, 'htmlonly');

	const instance = await runWmr(config, env.tmp.path);
	const page = await openWmr(config, instance);

	expect(await page.content()).toMatch('<h1>Hello wmr</h1>');
	await closePage(page);
}
