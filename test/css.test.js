import { setupTest, getStyle } from './test-helpers.js';
import expect from 'expect';

export const description = 'should load css files';

/**
 * @param {import('pentf/runner').TaskConfig} config
 */
export async function run(config) {
	const { page } = await setupTest(config, 'css');

	const heading = await getStyle(page, 'h1', 'color');
	const p = await getStyle(page, '.text', 'color');

	expect(heading).toEqual('rgb(255, 0, 0)');
	expect(p).toEqual('rgb(0, 0, 255)');
}
