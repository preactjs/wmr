import { setupTest, getStyle } from './test-helpers.js';
import { closePage } from 'pentf/browser_utils';
import { promises as fs } from 'fs';
import path from 'path';
import expect from 'expect';

// This marks the test as a failure, but will ignore it
export const expectedToFail = "CSS doesn't refresh";
export const description = 'should support CSS hmr when linked from js file';

/**
 * @param {import('pentf/runner').TaskConfig} config
 */
export async function run(config) {
	const { page, tmp } = await setupTest(config, 'css-hmr');

	let color = await getStyle(page, '#counter', 'color');
	expect(color).toEqual('rgb(255, 0, 0)');

	await page.waitForFunction(() => {
		const counter = document.querySelector('#counter');
		return +counter.textContent.match(/(\d+)/)[1] > 0;
	});

	// Simulate a user editing a file
	fs.writeFile(path.join(tmp.path, 'public', 'style.css'), '#counter { color: blue; }');

	await page.waitForFunction(
		() => {
			const counter = document.querySelector('#counter');
			return window.getComputedStyle(counter).color === 'rgb(0, 0, 255)';
		},
		{ timeout: 3000 }
	);

	await closePage(page);
}
