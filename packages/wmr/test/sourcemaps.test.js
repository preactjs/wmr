import { setupTest, teardown, loadFixture, runWmrFast, getOutput, withLog } from './test-helpers.js';

jest.setTimeout(30000);

describe('sourcemaps', () => {
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

	it('should import absolute file', async () => {
		await loadFixture('sourcemap-ts', env);
		instance = await runWmrFast(env.tmp.path, '--sourcemap');

		await withLog(instance.output, async () => {
			expect(await getOutput(env, instance)).toMatch(/it works/);
			expect(await env.page.evaluate('fetch("/index.ts.map").then(r => r.json())')).toEqual({
				file: 'index.ts',
				mappings: 'AAAA;AACA;AACA;AACA;AACA;AACA;AACA;AACA;AACA;',
				names: [],
				sources: ['/index.ts'],
				sourcesContent: [
					`export interface Foo {
	foo: string;
}

function getFoo(foo: Foo) {
	return foo.foo;
}

document.getElementById('out').textContent = getFoo({ foo: 'it works' });\n`
				],
				version: 3
			});
		});
	});

	it('should map jsx', async () => {
		await loadFixture('sourcemap-jsx', env);
		instance = await runWmrFast(env.tmp.path, '--sourcemap');

		await withLog(instance.output, async () => {
			expect(await getOutput(env, instance)).toMatch(/it works/);
			expect(await env.page.evaluate('fetch("/index.jsx.map").then(r => r.json())')).toEqual({
				file: 'index.jsx',
				mappings: 'AAAA;AAAA;AACA;AACA;AACA;AACA;AACA;AACA;AACA;',
				names: [],
				sources: ['/index.jsx'],
				sourcesContent: [
					`import { render } from 'preact';

function App() {
	return <h1>it works</h1>;
}

document.getElementById('out').textContent = '';
render(<App />, document.getElementById('out'));\n`
				],
				version: 3
			});
		});
	});
});
