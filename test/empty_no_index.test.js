import { setupTest, runWmr, openWmr } from './test-helpers.js';
import { closePage } from 'pentf/browser_utils';
import expect from 'expect';

export const description = 'should print warning for missing index.html file in public dir';

/**
 * @param {import('pentf/runner').TaskConfig} config
 */
export async function run(config) {
	const env = await setupTest(config, 'empty', { open: false });

	const instance = await runWmr(config, env.tmp.path);
	expect(instance.output[0]).toMatch(`missing "index.html" file`);

	const page = await openWmr(config, instance);
	expect(await page.content()).toMatch('Not Found');
	await closePage(page);
}
