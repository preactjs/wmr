import { setupTest } from './test-helpers.js';
import { waitForText } from 'pentf/browser_utils';

export const description = 'should support import() statements';

/**
 * @param {import('pentf/runner').TaskConfig} config
 */
export async function run(config) {
	const { page } = await setupTest(config, 'dynamic-import');

	await waitForText(page, 'Dynamic import works');
}
