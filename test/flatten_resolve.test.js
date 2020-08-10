import { setupTest, runWmr, waitForWmr } from './test-helpers.js';
import { newPage, interceptRequest } from 'pentf/browser_utils';
import { URL } from 'url';
import expect from 'expect';

// Skips this test
export const skip = () => 'Unsure if we want to support flattenting of dependencies to keep network requests low';
export const description = 'should minimize network traffic caused by dependencies';

/**
 * @param {import('pentf/runner').TaskConfig} config
 */
export async function run(config) {
	const env = await setupTest(config, 'flatten-resolve', { open: false });

	const instance = await runWmr(config, env.tmp.path);
	const addr = await waitForWmr(instance);
	const page = await newPage(config);

	let files = [];
	await interceptRequest(page, req => {
		const url = new URL(req.url());
		if (url.pathname.endsWith('.js')) {
			files.push(url.pathname);
		}
	});

	await page.goto(addr);
	await page.waitForSelector('p', { timeout: 2000 });

	expect(files).toEqual(['/index.js', '/bar.js']);
}
