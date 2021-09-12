import path from 'path';
import {
	getOutput,
	loadFixture,
	runWmr,
	runWmrFast,
	serveStatic,
	setupTest,
	teardown,
	withLog
} from './test-helpers.js';

jest.setTimeout(30000);

describe('node modules', () => {
	describe('development', () => {
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

		it('should resolve "main" field', async () => {
			await loadFixture('npm-main', env);
			instance = await runWmrFast(env.tmp.path);
			await withLog(instance.output, async () => {
				const text = await getOutput(env, instance);
				expect(text).toMatch(/it works/);
			});
		});

		it('should resolve "module" field', async () => {
			await loadFixture('npm-module', env);
			instance = await runWmrFast(env.tmp.path);
			await withLog(instance.output, async () => {
				const text = await getOutput(env, instance);
				expect(text).toMatch(/it works/);
			});
		});

		it('should resolve scoped pacakges field', async () => {
			await loadFixture('npm-main-scoped', env);
			instance = await runWmrFast(env.tmp.path);
			await withLog(instance.output, async () => {
				const text = await getOutput(env, instance);
				expect(text).toMatch(/it works/);
			});
		});

		describe('legacy', () => {
			it('should resolve deep "main" field', async () => {
				await loadFixture('npm-deep-main', env);
				instance = await runWmrFast(env.tmp.path);
				await withLog(instance.output, async () => {
					const text = await getOutput(env, instance);
					expect(text).toMatch(/it works/);
				});
			});

			it('should resolve deep "module" field', async () => {
				await loadFixture('npm-deep-module', env);
				instance = await runWmrFast(env.tmp.path);
				await withLog(instance.output, async () => {
					const text = await getOutput(env, instance);
					expect(text).toMatch(/it works/);
				});
			});

			it('should resolve deep sub packages as package', async () => {
				await loadFixture('npm-deep-nested', env);
				instance = await runWmrFast(env.tmp.path);
				await withLog(instance.output, async () => {
					const text = await getOutput(env, instance);
					expect(text).toMatch(/it works/);
				});
			});
		});

		describe('browser field', () => {
			it('should resolve relative "browser" field', async () => {
				await loadFixture('npm-browser-bare-relative', env);
				instance = await runWmrFast(env.tmp.path);
				await withLog(instance.output, async () => {
					const text = await getOutput(env, instance);
					expect(text).toMatch(/it works/);
				});
			});

			it('should resolve bare "browser" field', async () => {
				await loadFixture('npm-browser-bare-bare', env);
				instance = await runWmrFast(env.tmp.path);
				await withLog(instance.output, async () => {
					const text = await getOutput(env, instance);
					expect(text).toMatch(/it works/);
				});
			});

			it('should resolve relative import with relative "browser" field', async () => {
				await loadFixture('npm-browser-relative-relative', env);
				instance = await runWmrFast(env.tmp.path);
				await withLog(instance.output, async () => {
					const text = await getOutput(env, instance);
					expect(text).toMatch(/it works/);
				});
			});

			it('should resolve relative import with bare "browser" field', async () => {
				await loadFixture('npm-browser-relative-bare', env);
				instance = await runWmrFast(env.tmp.path);
				await withLog(instance.output, async () => {
					const text = await getOutput(env, instance);
					expect(text).toMatch(/it works/);
				});
			});

			it('should resolve deep relative "browser" field', async () => {
				await loadFixture('npm-browser-deep-relative', env);
				instance = await runWmrFast(env.tmp.path);
				await withLog(instance.output, async () => {
					const text = await getOutput(env, instance);
					expect(text).toMatch(/it works/);
				});
			});

			it('should resolve deep bare "browser" field', async () => {
				await loadFixture('npm-browser-deep-bare', env);
				instance = await runWmrFast(env.tmp.path);
				await withLog(instance.output, async () => {
					const text = await getOutput(env, instance);
					expect(text).toMatch(/it works/);
				});
			});
		});

		describe('"exports" field', () => {
			it('should resolve `exports: "./foo.js"`', async () => {
				await loadFixture('npm-export-sugar', env);
				instance = await runWmrFast(env.tmp.path);
				await withLog(instance.output, async () => {
					const text = await getOutput(env, instance);
					expect(text).toMatch(/it works/);
				});
			});

			it('should resolve `exports: { node: "./foo.js" }`', async () => {
				await loadFixture('npm-export-node', env);
				instance = await runWmrFast(env.tmp.path);
				await withLog(instance.output, async () => {
					const text = await getOutput(env, instance);
					expect(text).toMatch(/it works/);
				});
			});

			it('should resolve `exports: { import: "./foo.js" }`', async () => {
				await loadFixture('npm-export-import', env);
				instance = await runWmrFast(env.tmp.path);
				await withLog(instance.output, async () => {
					const text = await getOutput(env, instance);
					expect(text).toMatch(/it works/);
				});
			});

			it('should resolve `exports: { default: "./foo.js" }`', async () => {
				await loadFixture('npm-export-default', env);
				instance = await runWmrFast(env.tmp.path);
				await withLog(instance.output, async () => {
					const text = await getOutput(env, instance);
					expect(text).toMatch(/it works/);
				});
			});

			it('should resolve "import" first', async () => {
				await loadFixture('npm-export-import-first', env);
				instance = await runWmrFast(env.tmp.path);
				await withLog(instance.output, async () => {
					const text = await getOutput(env, instance);
					expect(text).toMatch(/it works/);
				});
			});
		});

		describe('commonjs', () => {
			it('should resolve "module.exports = ..."', async () => {
				await loadFixture('npm-commonjs-default', env);
				instance = await runWmrFast(env.tmp.path);
				await withLog(instance.output, async () => {
					const text = await getOutput(env, instance);
					expect(text).toMatch(/it works/);
				});
			});
		});

		describe('auto install', () => {
			it('should install package', async () => {
				await loadFixture('npm-auto-install', env);
				instance = await runWmrFast(env.tmp.path, '--autoInstall', { env: { DISABLE_LOCAL_NPM: true } });
				await withLog(instance.output, async () => {
					const text = await getOutput(env, instance);
					expect(text).toMatch(/it works/);
				});
			});
		});
	});

	describe('production', () => {
		/** @type {TestEnv} */
		let env;
		/** @type {WmrInstance} */
		let instance;
		/** @type {(()=>void)[]} */
		let cleanup = [];

		beforeEach(async () => {
			env = await setupTest();
		});

		afterEach(async () => {
			await teardown(env);
			instance.close();
			await Promise.all(cleanup.map(c => Promise.resolve().then(c)));
			cleanup.length = 0;
		});

		it('should bundle npm deps', async () => {
			await loadFixture('npm-main', env);
			instance = await runWmr(env.tmp.path, 'build');

			expect(await instance.done).toEqual(0);
			const { address, stop } = serveStatic(path.join(env.tmp.path, 'dist'));
			cleanup.push(stop);
			await env.page.goto(address, {
				waitUntil: ['networkidle0', 'load']
			});

			await withLog(instance.output, async () => {
				const text = await env.page.content();
				expect(text).toMatch(/it works/);
			});
		});
	});
});
