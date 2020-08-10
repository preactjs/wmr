import { setupTest, getStyle } from './test-helpers.js';
import { getAttribute } from 'pentf/browser_utils';
import expect from 'expect';
import { promises as fs } from 'fs';
import path from 'path';

/**
 * @param {import('pentf/loader').TestFn} test
 * @param {import('pentf/loader').DescribeFn} describe
 */
export function suite(test, describe) {
	test('should load css files', async config => {
		const { page } = await setupTest(config, 'css');

		const heading = await getStyle(page, 'h1', 'color');
		const p = await getStyle(page, '.text', 'color');

		expect(heading).toEqual('rgb(255, 0, 0)');
		expect(p).toEqual('rgb(0, 0, 255)');
	});

	test('should support CSS Modules', async config => {
		const { page } = await setupTest(config, 'css-modules');

		const heading = await getStyle(page, 'h1', 'color');
		const p = await getStyle(page, 'p', 'color');

		expect(heading).toEqual('rgb(255, 0, 0)');
		expect(p).toEqual('rgb(0, 0, 255)');

		const className = await getAttribute(page, 'h1', 'className');
		expect(className).not.toEqual('heading');
	});

	test('should support css @import rules', async config => {
		const { page } = await setupTest(config, 'css-at-import');

		const heading = await getStyle(page, 'h1', 'color');
		expect(heading).toEqual('rgb(255, 0, 0)');
	});

	describe('HMR', () => {
		/**
		 * @param {import('pentf/runner').TaskConfig} config
		 * @param {string} fixture
		 */
		async function testHmr(config, fixture) {
			const { page, tmp } = await setupTest(config, fixture);
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
		}

		// TODO: CSS doesn't refresh
		test.skip('should support CSS hmr when linked from HTML file', async config => {
			await testHmr(config, 'css-hmr');
		});

		// TODO: CSS doesn't refresh
		test.skip('should support CSS hmr when linked from js file', async config => {
			await testHmr(config, 'css-hmr-js');
		});
	});
}
