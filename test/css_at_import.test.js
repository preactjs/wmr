import { setupTest, getStyle } from './test-helpers.js';
import { closePage } from 'pentf/browser_utils';
import expect from 'expect';

export const description = 'should support css @import rules';

/**
 * @param {import('pentf/runner').TaskConfig} config
 */
export async function run(config) {
	const { page } = await setupTest(config, 'css-modules');

	const heading = await getStyle(page, 'h1', 'color');
	expect(heading).toEqual('rgb(255, 0, 0)');

	await closePage(page);
}
