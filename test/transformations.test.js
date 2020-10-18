import path from 'path';
import { promises as fs } from 'fs';
import { setupTest, teardown, runWmr, loadFixture, get } from './test-helpers.js';

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

		it('should transform JSXMemberExpression', async () => {
			const expected = await readFile(env, 'jsx-member.expected.js');
			expect((await get(instance, 'jsx-member.js')).body).toEqual(expected);
		});

		it('should not change escaped HTML characters', async () => {
			const expected = await readFile(env, 'jsx-escaped.expected.js');
			expect((await get(instance, 'jsx-escaped.js')).body).toEqual(expected);
		});
	});
});
