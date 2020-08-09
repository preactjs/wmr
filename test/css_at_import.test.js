import { setupTest, runWmr, openWmr, getStyle } from './test-helpers.js';
import { closePage } from 'pentf/browser_utils';
import expect from 'expect';

export const description = 'should support css @import rules';

/**
 * @param {import('pentf/runner').TaskConfig} config
 */
export async function run(config) {
	const env = await setupTest(config, 'css-modules');

	const instance = await runWmr(config, env.tmp.path);
	const page = await openWmr(config, instance);

	const heading = await getStyle(page, 'h1', 'color');
	expect(heading).toEqual('rgb(255, 0, 0)');

	await closePage(page);
}
