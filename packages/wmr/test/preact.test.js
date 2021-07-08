import {
	setupTest,
	teardown,
	loadFixture,
	runWmrFast,
	getOutput,
	withLog,
	waitForPass,
	updateFile
} from './test-helpers.js';

describe('Preact', () => {
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

	describe('Prefresh', () => {
		it('should re-render component without destroying DOM', async () => {
			await loadFixture('preact-jsx', env);
			instance = await runWmrFast(env.tmp.path);
			await env.page.goto(await instance.address, { waitUntil: 'networkidle0' });
			expect(await env.page.content()).toMatch(`it works`);

			await withLog(instance.output, async () => {
				const h1 = await env.page.$('h1');
				await updateFile(env.tmp.path, 'app.js', content => {
					return content.replace('it works', 'it still works');
				});

				await waitForPass(async () => {
					const text = await h1.evaluate(el => el.textContent);
					expect(text).toEqual('it still works');
				});
			});
		});

		it('should not be injected in files without JSX', async () => {
			await loadFixture('preact-no-jsx', env);
			instance = await runWmrFast(env.tmp.path);
			expect(await getOutput(env, instance)).toMatch(`it works`);

			const mod = await env.page.evaluate('fetch("./index.js").then(r => r.text())');
			expect(mod).not.toMatch(/prefresh/i);
		});
	});
});
