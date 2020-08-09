import { setupTest, runWmr, waitForMessage } from './test-helpers.js';
import { newPage, closePage } from 'pentf/browser_utils';
import expect from 'expect';

export const description = 'should listen on port';

/**
 * @param {import('pentf/runner').TaskConfig} config
 */
export async function run(config) {
	const env = await setupTest(config, 'simple');
	const instance = await runWmr(config, env.tmp.path);
	await waitForMessage(instance.output, /(^Listening|^Error)/);

	const output = instance.output.join('\n');

	expect(output).not.toMatch(/^Error/m);

	expect(output).toMatch(/Listening on http:\/\/localhost:\d+/);
	expect(output).toMatch(/⌙ http:\/\/\d+.\d+.\d+.\d+:\d+/);

	const page = await newPage(config);

	expect(await page.content()).toMatch(/<html>/);
	await closePage(page);
}
