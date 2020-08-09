import { setupTest, runWmr, openWmr } from './test-helpers.js';
import { closePage } from 'pentf/browser_utils';
import expect from 'expect';

export const description = 'should transform JSX';

/**
 * @param {import('pentf/runner').TaskConfig} config
 */
export async function run(config) {
	const env = await setupTest(config, 'jsx');

	const instance = await runWmr(config, env.tmp.path);
	const page = await openWmr(config, instance);

	await page.waitForSelector('#result', { timeout: 2000 });

	const text = await page.$eval('#result', el => el.textContent);
	expect(text).toEqual('foobarbaz');

	await closePage(page);
}
