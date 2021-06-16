import { parseEnvFile } from '../src/lib/environment.js';
import { setupTest, teardown, loadFixture, runWmrFast, getOutput, withLog } from './test-helpers.js';

describe('.env files', () => {
	describe('parseEnvFiles', () => {
		it('should parse KEY=VAL', () => {
			expect(parseEnvFile('KEY=VAL')).toEqual({ KEY: 'VAL' });
			expect(parseEnvFile('KEY=0')).toEqual({ KEY: '0' });
			expect(parseEnvFile('KEY=true')).toEqual({ KEY: 'true' });
		});

		it('should parse empty value', () => {
			expect(parseEnvFile('KEY=')).toEqual({ KEY: '' });
		});

		it('should trimg value', () => {
			expect(parseEnvFile('KEY=VAL  ')).toEqual({ KEY: 'VAL' });
		});

		it('should parse quotes', () => {
			expect(parseEnvFile('KEY="VAL"')).toEqual({ KEY: 'VAL' });
			expect(parseEnvFile("KEY='VAL'")).toEqual({ KEY: 'VAL' });
		});

		it('should repalce newline in double quotes', () => {
			expect(parseEnvFile('KEY="VAL\\nfoo"')).toEqual({ KEY: 'VAL\nfoo' });
		});

		it('should parse multiple values', () => {
			expect(parseEnvFile('KEY1=VAL1\nKEY2=VAL2')).toEqual({ KEY1: 'VAL1', KEY2: 'VAL2' });
		});
	});

	describe('fixtures', () => {
		jest.setTimeout(30000);

		/** @type {TestEnv} */
		let env;
		/** @type {WmrInstance} */
		let instance;

		beforeEach(async () => {
			env = await setupTest();
		});

		afterEach(async () => {
			await teardown(env);
			instance.close();
		});

		it('should load env files into process.env', async () => {
			await loadFixture('env', env);
			instance = await runWmrFast(env.tmp.path);
			await withLog(instance.output, async () => {
				const values = { FOO: 'bar', OVERRIDE: '11', EMPTY: '', FOO_LOCAL: 'bar', NODE_ENV: 'development' };
				const expected = Object.keys(values)
					.map(key => `${key}=${JSON.stringify(values[key])}`)
					.join(', ');
				expect(await getOutput(env, instance)).toContain(expected);
			});
		});

		it('should give env variables precedence over env files', async () => {
			await loadFixture('env-precedence', env);
			instance = await runWmrFast(env.tmp.path, { env: { WMR_FOO: 'it works' } });
			await getOutput(env, instance);

			await withLog(instance.output, async () => {
				const foo = await page.$eval('#foo', el => el.textContent);
				const bar = await page.$eval('#bar', el => el.textContent);

				expect(foo).toEqual('it works');
				expect(bar).toEqual('it works');
			});
		});
	});
});
