import { setupTest, runWmr, openWmr } from './test-helpers.js';
import { closePage } from 'pentf/browser_utils';

// This marks the test as a failure, but will ignore it
export const expectedToFail = 'process is not stubbed';
export const description = 'should transform process.env.NODE_ENV';

/**
 * @param {import('pentf/runner').TaskConfig} config
 */
export async function run(config) {
	const env = await setupTest(config, 'process');

	const instance = await runWmr(config, env.tmp.path);
	const page = await openWmr(config, instance);

	await page.waitForSelector('#result', { timeout: 2000 });
	await closePage(page);
}
