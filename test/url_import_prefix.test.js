import { setupTest, __dirname } from './test-helpers.js';
import { closePage } from 'pentf/browser_utils';
import expect from 'expect';
import { promises as fs } from 'fs';
import path from 'path';

export const description = 'should print warning for missing index.html file (no public dir)';

/**
 * @param {import('pentf/runner').TaskConfig} config
 */
export async function run(config) {
	const { page } = await setupTest(config, 'url-prefix');

	expect(await page.content()).toMatch(/<pre id="out">{.+}<\/pre>/);

	const json = JSON.parse(await page.$eval('#out', el => el.textContent));
	expect(json).toHaveProperty('htmlUrl', '/index.html?asset');
	expect(json).toHaveProperty('selfUrl', '/index.js?asset');

	const out = await page.evaluate(async () => await (await fetch('/index.js?asset')).text());
	expect(out).toEqual(
		// @ts-ignore
		await fs.readFile(path.resolve(__dirname(import.meta.url), 'fixtures/url-prefix/index.js'), 'utf-8')
	);

	await closePage(page);
}
