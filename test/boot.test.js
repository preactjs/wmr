import { setupTest, runWmr, waitForMessage, openWmr } from './test-helpers.js';
import { newPage } from 'pentf/browser_utils';
import expect from 'expect';

/**
 * @param {import('pentf/loader').TestFn} test
 * @param {import('pentf/loader').DescribeFn} describe
 */
export function suite(test, describe) {
	test('should listen on port', async config => {
		const env = await setupTest(config, 'simple', { open: false });
		const instance = await runWmr(config, env.tmp.path);
		await waitForMessage(instance.output, /(^Listening|^Error)/);

		const output = instance.output.join('\n');

		expect(output).not.toMatch(/^Error/m);

		expect(output).toMatch(/Listening on http:\/\/localhost:\d+/);
		expect(output).toMatch(/⌙ http:\/\/\d+.\d+.\d+.\d+:\d+/);

		const page = await newPage(config);

		expect(await page.content()).toMatch(/<html>/);
	});

	test('should load html', async config => {
		const { page } = await setupTest(config, 'htmlonly');
		expect(await page.content()).toMatch('<h1>Hello wmr</h1>');
	});

	describe('Empty', () => {
		test('should print warning for missing index.html file in public dir', async config => {
			const env = await setupTest(config, 'empty', { open: false });

			const instance = await runWmr(config, env.tmp.path);
			expect(instance.output[0]).toMatch(`missing "index.html" file`);

			const page = await openWmr(config, instance);
			expect(await page.content()).toMatch('Not Found');
		});

		test('should start successfully with only an HTML file (no public dir)', async config => {
			const env = await setupTest(config, 'htmlonly-nopublic', { open: false });

			const instance = await runWmr(config, env.tmp.path);
			expect(instance.output[0]).not.toMatch(`missing an "index.html"`);

			const page = await openWmr(config, instance);
			expect(await page.content()).toMatch('<h1>Hello wmr</h1>');
		});

		test('should print warning for missing index.html file (no public dir)', async config => {
			const env = await setupTest(config, 'empty-nopublic', { open: false });

			const instance = await runWmr(config, env.tmp.path);
			expect(instance.output[0]).toMatch(`missing "index.html" file`);

			const page = await openWmr(config, instance);
			expect(await page.content()).toMatch('Not Found');
		});
	});
}
