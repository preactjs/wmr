import { setupTest, runWmr, openWmr } from './test-helpers.js';
import { closePage } from 'pentf/browser_utils';
import expect from 'expect';

export const skip = () => 'Extensionless imports in TypeScript are not supported right now';
export const description = 'should transform TypeScript files';

/**
 * @param {import('pentf/runner').TaskConfig} config
 */
export async function run(config) {
	const env = await setupTest(config, 'ts-complex');

	const instance = await runWmr(config, env.tmp.path);
	const page = await openWmr(config, instance);

	await page.waitForSelector('#result', { timeout: 2000 });

	const text = await page.$eval('#result', el => el.textContent);
	expect(text).toEqual('barbaz');

	await closePage(page);
}
