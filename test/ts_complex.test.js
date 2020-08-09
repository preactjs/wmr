import { setupTest } from './test-helpers.js';
import { closePage } from 'pentf/browser_utils';
import expect from 'expect';

export const skip = () => 'Extensionless imports in TypeScript are not supported right now';
export const description = 'should transform TypeScript files';

/**
 * @param {import('pentf/runner').TaskConfig} config
 */
export async function run(config) {
	const { page } = await setupTest(config, 'ts-complex');

	await page.waitForSelector('#result', { timeout: 2000 });
	const text = await page.$eval('#result', el => el.textContent);
	expect(text).toEqual('barbaz');

	await closePage(page);
}
