import { setupTest } from './test-helpers.js';

// This marks the test as a failure, but will ignore it
export const expectedToFail = 'process is not stubbed';
export const description = 'should transform process.env.NODE_ENV';

/**
 * @param {import('pentf/runner').TaskConfig} config
 */
export async function run(config) {
	const { page } = await setupTest(config, 'process');
	await page.waitForSelector('#result', { timeout: 2000 });
}
