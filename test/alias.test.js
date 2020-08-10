import { setupTest } from './test-helpers.js';
import expect from 'expect';

// This marks the test as a failure, but will ignore it
export const expectedToFail = 'TODO: We need to point wmr to a specific pacakge.json to read aliases from.';
export const description = 'should use aliases';

/**
 * @param {import('pentf/runner').TaskConfig} config
 */
export async function run(config) {
	const { page } = await setupTest(config, 'alias');
	const content = await page.$eval('body', el => el.textContent);
	expect(content).toMatch('Aliasing works.');
}
