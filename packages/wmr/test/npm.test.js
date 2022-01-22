import path from 'path';
import {
	getOutput,
	loadFixture,
	runWmr,
	runWmrFast,
	serveStatic,
	setupTest,
	teardown,
	waitForMessage,
	waitForPass,
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

		it('should load *.json files', async () => {
			await loadFixture('npm-json', env);
			instance = await runWmrFast(env.tmp.path);
			await withLog(instance.output, async () => {
				const text = await getOutput(env, instance);
				expect(text).toMatch(/it works/);
			});
		});

		it('should resolve assets', async () => {
			await loadFixture('npm-styles', env);
			instance = await runWmrFast(env.tmp.path);
			await getOutput(env, instance);

			await withLog(instance.output, async () => {
				await waitForPass(async () => {
					const color = await env.page.$eval('h1', el => getComputedStyle(el).color);
					expect(color).toBe('rgb(255, 0, 0)');
				});
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

			it('should resolve to "index.js" if neither "main", "module" or "exports" is present', async () => {
				await loadFixture('npm-incomplete', env);
				instance = await runWmrFast(env.tmp.path);
				await withLog(instance.output, async () => {
					const text = await getOutput(env, instance);
					expect(text).toMatch(/it works/);
				});
			});

			it('should resolve to "index.js" if neither "main", "module" or "exports" is present in deep import', async () => {
				await loadFixture('npm-incomplete-deep', env);
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

			it('should inline proxy modules based on `process.env.NODE_ENV`', async () => {
				await loadFixture('npm-commonjs-proxy', env);
				instance = await runWmrFast(env.tmp.path);
				await withLog(instance.output, async () => {
					const text = await getOutput(env, instance);
					expect(text).toMatch(/This is development/);
				});
			});

			it('should inline single top level function iife', async () => {
				await loadFixture('npm-commonjs-iife', env);
				instance = await runWmrFast(env.tmp.path);
				await withLog(instance.output, async () => {
					const text = await getOutput(env, instance);
					expect(text).toMatch(/it works/);
				});
			});

			it('should inline single top level function iife #2', async () => {
				await loadFixture('npm-commonjs-iife-2', env);
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

			it('should install versioned package', async () => {
				await loadFixture('npm-auto-install-version', env);
				instance = await runWmrFast(env.tmp.path, '--autoInstall', { env: { DISABLE_LOCAL_NPM: true } });
				await withLog(instance.output, async () => {
					const text = await getOutput(env, instance);
					expect(text).toMatch(/it works/);
				});
			});

			// eslint-disable-next-line jest/expect-expect
			it('should fetch package from --registry', async () => {
				await loadFixture('npm-auto-install-version', env);
				instance = await runWmrFast(env.tmp.path, '--autoInstall', '--registry', 'https://example.com', {
					env: { DISABLE_LOCAL_NPM: true }
				});
				await getOutput(env, instance);
				await waitForMessage(instance.output, /500.*https:\/\/example\.com\/smoldash/);
			});

			it('should load CSS from installed package', async () => {
				await loadFixture('npm-auto-install-css', env);
				instance = await runWmrFast(env.tmp.path, '--autoInstall', { env: { DISABLE_LOCAL_NPM: true } });
				await getOutput(env, instance);

				await withLog(instance.output, async () => {
					await waitForPass(async () => {
						const color = await env.page.$eval('a', el => getComputedStyle(el).color);
						expect(color).toBe('rgb(17, 139, 238)');
					});
				});
			});

			it('should load CSS from installed package #2', async () => {
				await loadFixture('npm-auto-install-css-2', env);
				instance = await runWmrFast(env.tmp.path, '--autoInstall', { env: { DISABLE_LOCAL_NPM: true } });
				await getOutput(env, instance);

				await withLog(instance.output, async () => {
					await waitForPass(async () => {
						const color = await env.page.$eval('a', el => getComputedStyle(el).color);
						expect(color).toBe('rgb(17, 139, 238)');
					});
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

		it('should load assets', async () => {
			await loadFixture('npm-styles', env);
			instance = await runWmr(env.tmp.path, 'build');

			expect(await instance.done).toEqual(0);
			const { address, stop } = serveStatic(path.join(env.tmp.path, 'dist'));
			cleanup.push(stop);
			await env.page.goto(address, {
				waitUntil: ['networkidle0', 'load']
			});

			await withLog(instance.output, async () => {
				await waitForPass(async () => {
					const color = await env.page.$eval('h1', el => getComputedStyle(el).color);
					expect(color).toBe('rgb(255, 0, 0)');
				});
			});
		});
	});
});
