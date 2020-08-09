import { setupTest, runWmr, openWmr } from './test-helpers.js';
import { closePage, waitForText } from 'pentf/browser_utils';

export const description = 'should support import() statements';

/**
 * @param {import('pentf/runner').TaskConfig} config
 */
export async function run(config) {
	const env = await setupTest(config, 'dynamic-import');

	const instance = await runWmr(config, env.tmp.path);
	const page = await openWmr(config, instance);

	await waitForText(page, 'Dynamic import works');
	await closePage(page);
}
