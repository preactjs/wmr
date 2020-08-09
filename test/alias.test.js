import { setupTest, runWmr, openWmr } from './test-helpers.js';
import { closePage } from 'pentf/browser_utils';
import expect from 'expect';

// This marks the test as a failure, but will ignore it
export const expectedToFail = 'TODO: We need to point wmr to a specific pacakge.json to read aliases from.';
export const description = 'should use aliases';

/**
 * @param {import('pentf/runner').TaskConfig} config
 */
export async function run(config) {
	const env = await setupTest(config, 'alias');

	const instance = await runWmr(config, env.tmp.path);
	const page = await openWmr(config, instance);
	const content = await page.$eval('body', el => el.textContent);
	expect(content).toMatch('Aliasing works.');

	await closePage(page);
}
