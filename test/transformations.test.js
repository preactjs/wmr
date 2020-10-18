import path from 'path';
import { promises as fs } from 'fs';
import { setupTest, teardown, runWmr, loadFixture, get } from './test-helpers.js';
import { modularizeCss } from '../src/plugins/wmr/styles-plugin.js';

const runWmrFast = (cwd, ...args) => runWmr(cwd, '--no-optimize', '--no-compress', ...args);

const readFile = (env, filename) => fs.readFile(path.join(env.tmp.path, filename), 'utf-8');

describe('transformations', () => {
	/** @type {TestEnv} */
	let env;
	/** @type {WmrInstance} */
	let instance;

	beforeAll(async () => {
		env = await setupTest();
		await loadFixture('transformations', env);
		instance = await runWmrFast(env.tmp.path, {
			env: {
				BYPASS_HMR: 'true'
			}
		});
		await instance.address;
	});

	afterAll(async () => {
		instance.close();
		await teardown(env);
	});

	describe('jsx', () => {
		it('should transform JSX', async () => {
			const expected = await readFile(env, 'jsx.expected.js');
			expect((await get(instance, 'jsx.js')).body).toEqual(expected);
		});
	});

	describe('css', () => {
		// wmr/162
		it('should transform pseudo selector class argument', async () => {
			const css = `.foo {}\n.bar {}\n.bar:not(.foo) { padding: 0; }`;
			const expected = `.bar_375o4j:not(.foo_375o4j){padding:0;}`;
			expect(await modularizeCss(css, 'foo')).toEqual(expected);
		});

		it('should not cut off attribute selectors', async () => {
			let css = `.name:not([data-type="empty"])::after { padding: 0 }`;
			let expected = `.name_375o4j:not([data-type="empty"])::after{padding:0;}`;
			expect(await modularizeCss(css, 'foo')).toEqual(expected);

			css = `.name:not([data-type="empty"][a^="b"])::after { padding: 0 }`;
			expected = `.name_375o4j:not([data-type="empty"][a^="b"])::after{padding:0;}`;
			expect(await modularizeCss(css, 'foo')).toEqual(expected);
		});
	});
});
