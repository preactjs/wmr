import { setupTest, getStyle } from './test-helpers.js';
import { getAttribute } from 'pentf/browser_utils';
import expect from 'expect';

export const description = 'should support css modules';

/**
 * @param {import('pentf/runner').TaskConfig} config
 */
export async function run(config) {
	const { page } = await setupTest(config, 'css-modules');

	const heading = await getStyle(page, 'h1', 'color');
	const p = await getStyle(page, 'p', 'color');

	expect(heading).toEqual('rgb(255, 0, 0)');
	expect(p).toEqual('rgb(0, 0, 255)');

	const className = await getAttribute(page, 'h1', 'className');
	expect(className).not.toEqual('heading');
}
