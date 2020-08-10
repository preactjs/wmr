import { setupTest } from './test-helpers.js';
import expect from 'expect';

export const description = 'should transform JSX';

/**
 * @param {import('pentf/runner').TaskConfig} config
 */
export async function run(config) {
	const { page } = await setupTest(config, 'jsx');

	await page.waitForSelector('#result', { timeout: 2000 });
	const text = await page.$eval('#result', el => el.textContent);
	expect(text).toEqual('foobarbaz');
}
