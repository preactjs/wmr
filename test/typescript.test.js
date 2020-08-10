import { setupTest } from './test-helpers.js';
import expect from 'expect';

/**
 * @param {import('pentf/loader').TestFn} test
 * @param {import('pentf/loader').DescribeFn} describe
 */
export function suite(test, describe) {
	// TODO: Not supported right now
	test.skip('should transform ts files', async config => {
		const { page } = await setupTest(config, 'ts-simple');

		await page.waitForSelector('#result', { timeout: 2000 });
		const text = await page.$eval('#result', el => el.textContent);
		expect(text).toEqual('Result: foo');
	});

	test('should transform tsx files', async config => {
		const { page } = await setupTest(config, 'tsx-simple');

		await page.waitForSelector('#result', { timeout: 2000 });
		const text = await page.$eval('#result', el => el.textContent);
		expect(text).toEqual('foobarbaz');
	});

	// TODO: Extensionless imports in TypeScript are not supported right now
	test.skip('should support mixing TS and JS', async config => {
		const { page } = await setupTest(config, 'ts-complex');

		await page.waitForSelector('#result', { timeout: 2000 });
		const text = await page.$eval('#result', el => el.textContent);
		expect(text).toEqual('barbaz');
	});
}
