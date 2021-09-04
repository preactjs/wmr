import { loadFixture, runWmr, setupTest, teardown, withLog } from './test-helpers.js';
import { promises as fs } from 'fs';
import path from 'path';

jest.setTimeout(30000);

describe('CLI', () => {
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

	describe('--minify', () => {
		async function runTestCase() {
			expect(await instance.done).toEqual(0);

			const dist = path.join(env.tmp.path, 'dist');
			const files = await fs.readdir(dist);

			const js = path.join(
				dist,
				files.find(x => x.endsWith('.js'))
			);
			const script = await fs.readFile(js, 'utf-8');
			return script;
		}

		it('should be enabled by default', async () => {
			await loadFixture('cli-minify', env);
			instance = await runWmr(env.tmp.path, 'build');

			await withLog(instance.output, async () => {
				const script = await runTestCase();
				expect(script).not.toMatch(/foo\.bar/);
			});
		});

		it('should be enabled via --minify', async () => {
			await loadFixture('cli-minify', env);
			instance = await runWmr(env.tmp.path, 'build', '--minify');

			await withLog(instance.output, async () => {
				const script = await runTestCase();
				expect(script).not.toMatch(/foo\.bar/);
			});
		});

		it('should be disabled via --minify false', async () => {
			await loadFixture('cli-minify', env);
			instance = await runWmr(env.tmp.path, 'build', '--minify', 'false');

			await withLog(instance.output, async () => {
				const script = await runTestCase();
				expect(script).toMatch(/foo\.bar/);
			});
		});

		it('should be disabled via --no-minify', async () => {
			await loadFixture('cli-minify', env);
			instance = await runWmr(env.tmp.path, 'build', '--no-minify');

			await withLog(instance.output, async () => {
				const script = await runTestCase();
				expect(script).toMatch(/foo\.bar/);
			});
		});
	});
});
