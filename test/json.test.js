import { setupTest } from './test-helpers.js';
import { closePage } from 'pentf/browser_utils';
import expect from 'expect';

// This marks the test as a failure, but will ignore it
export const expectedToFail = "Browser don't support json mime type yet";
export const description = 'should load json files';

/**
 * @param {import('pentf/runner').TaskConfig} config
 */
export async function run(config) {
	const { page } = await setupTest(config, 'json');

	await page.waitForSelector('#result', { timeout: 2000 });

	const text = JSON.parse(await page.$eval('#result', el => el.textContent));
	expect(text).toEqual('{"foo":123}');

	await closePage(page);
}
