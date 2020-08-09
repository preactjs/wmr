import { setupTest, runWmr, openWmr, getStyle } from './test-helpers.js';
import { closePage } from 'pentf/browser_utils';
import expect from 'expect';

export const description = 'should load css files';

/**
 * @param {import('pentf/runner').TaskConfig} config
 */
export async function run(config) {
	const env = await setupTest(config, 'css');

	const instance = await runWmr(config, env.tmp.path);
	const page = await openWmr(config, instance);

	const heading = await getStyle(page, 'h1', 'color');
	const p = await getStyle(page, '.text', 'color');

	expect(heading).toEqual('rgb(255, 0, 0)');
	expect(p).toEqual('rgb(0, 0, 255)');

	await closePage(page);
}
