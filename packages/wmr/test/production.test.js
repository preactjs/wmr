import path from 'path';
import { promises as fs } from 'fs';
import { setupTest, teardown, runWmr, loadFixture, serveStatic } from './test-helpers.js';
import { printCoverage, analyzeTrace } from './tracing-helpers.js';

jest.setTimeout(30000);

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

	it('should allow overwriting json loader', async () => {
		await loadFixture('overwrite-loader-json', env);
		instance = await runWmr(env.tmp.path, 'build');
		const code = await instance.done;
		const output = instance.output.join('\n');
		console.log(output);

		expect(code).toEqual(0);

		const { address, stop } = serveStatic(path.join(env.tmp.path, 'dist'));
		cleanup.push(stop);

		await env.page.goto(address, {
			waitUntil: ['networkidle0', 'load']
		});

		expect(await env.page.content()).toMatch(/foobarbaz/);
	});

	it('should allow overwriting url loader', async () => {
		await loadFixture('overwrite-loader-url', env);
		instance = await runWmr(env.tmp.path, 'build');
		const code = await instance.done;
		const output = instance.output.join('\n');
		console.log(output);

		expect(code).toEqual(0);

		const { address, stop } = serveStatic(path.join(env.tmp.path, 'dist'));
		cleanup.push(stop);

		await env.page.goto(address, {
			waitUntil: ['networkidle0', 'load']
		});

		const text = await env.page.content();
		expect(text).toMatch(/my-url: \/assets\/foo\..*\.svg/);
		expect(text).toMatch(/url: \/assets\/foo\..*\.svg/);
		expect(text).toMatch(/fallback: \/assets\/foo\..*\.svg/);
	});

	describe('demo app', () => {
		it('should serve the demo app', async () => {
			await loadFixture('../../../../examples/demo', env);
			for (const d of ['dist', 'node_modules', '.cache']) {
				await fs.rmdir(path.join(env.tmp.path, d), { recursive: true });
			}
			instance = await runWmr(env.tmp.path, 'build', '--prerender');
			const code = await instance.done;
			const output = instance.output.join('\n');
			console.log(output);
			if (code !== 0 || /error/i.test(output)) {
				console.info(output);
			} else {
				console.info(output.match(/Wrote .+ to disk/) + '');
			}
			expect(code).toBe(0);

			const distFiles = await fs.readdir(path.join(env.tmp.path, 'dist'));

			expect(distFiles).toContain('index.html');
			expect(distFiles).toContain('assets');
			expect(distFiles).toContain('chunks');
			expect(distFiles).toContainEqual(expect.stringMatching(/^index\.\w+\.js$/));

			const { address, stop } = serveStatic(path.join(env.tmp.path, 'dist'));
			cleanup.push(stop);

			const logs = [];
			function log(type, text) {
				logs.push(`${type}: ${text}`);
				console.log(`  ${type}: ${text}`);
			}
			env.page.on('console', m => log(m.type(), m.text()));
			env.page.on('error', err => log('error', err));
			env.page.on('pageerror', err => log('page error', err));

			// Set up device emulation:
			const RTT_ADJUST = 3.75;
			const THROUGHPUT_ADJUST = 0.9;
			const kbps = (1024 * THROUGHPUT_ADJUST) / 8;
			const cdp = await env.page.target().createCDPSession();
			// 150ms RTT, 1.6mbps down, 750kbps up:
			await cdp.send('Network.enable');
			await cdp.send('Network.emulateNetworkConditions', {
				offline: false,
				latency: 150 * RTT_ADJUST,
				downloadThroughput: 1.6 * 1024 * kbps,
				uploadThroughput: 750 * kbps
			});
			// 6x slowdown:
			await cdp.send('Emulation.setCPUThrottlingRate', { rate: 6 });

			// Nexus 5 viewport + mobile, disable caching:
			await env.page.emulate(require('puppeteer/DeviceDescriptors').devicesMap['Nexus 5']);
			await env.page.setCacheEnabled(false);

			await page.coverage.startJSCoverage();
			await page.coverage.startCSSCoverage();
			await env.page.tracing.start({
				categories: ['devtools.timeline']
			});
			await env.page.goto(address);

			// click a counter button so that re-rendering code isn't considered unused:
			await env.page.click('button');

			const jsCoverageData = await page.coverage.stopJSCoverage();
			const jsCov = printCoverage(jsCoverageData);
			const cssCov = printCoverage(await page.coverage.stopCSSCoverage());

			const trace = JSON.parse((await env.page.tracing.stop()).toString('utf-8'));
			const timelineDesc = analyzeTrace(trace, jsCoverageData);

			// Ensure the content was rendered:
			const html = await env.page.content();
			expect(html).toMatch(/This is the home page/);

			// Ensure there were no errors:
			// TODO: Investigate preloading warnings
			expect(logs.filter(msg => !/warning: A preload/i.test(msg))).toEqual([]);

			// Print stats:
			const dent = t => t.replace(/^/gm, '  ');
			console.info(
				`JS Coverage (uncompressed):${dent(jsCov.analysis)}\n` +
					`CSS Coverage (uncompressed):${dent(cssCov.analysis)}\n` +
					`Timeline (6x slowdown, Slow 3G):${dent(timelineDesc)}`
			);

			// Ensure at least 50% of the code is used:
			for (const filename in jsCov.files) {
				const data = jsCov.files[filename];
				expect(data.unused / data.size).toBeLessThan(0.5);
			}
			for (const filename in cssCov.files) {
				const data = cssCov.files[filename];
				expect(data.unused / data.size).toBeLessThan(0.5);
			}
		});
	});

	describe('CSS Asset Graph Optimization', () => {
		it('should hoist dynamically imported CSS into unconditionally loaded parent', async () => {
			await loadFixture('css', env);
			instance = await runWmr(env.tmp.path, 'build');
			const code = await instance.done;
			console.info(instance.output.join('\n'));
			expect(code).toBe(0);

			const readdir = async f => (await fs.readdir(path.join(env.tmp.path, f))).filter(f => f[0] !== '.');
			const assets = await readdir('dist/assets');
			const chunks = await readdir('dist/chunks');

			expect(assets).toEqual([expect.stringMatching(/^style\.\w+\.css$/)]);
			expect(chunks).toEqual([expect.stringMatching(/^index\.\w+\.js$/), expect.stringMatching(/^index\.\w+\.js$/)]);

			const css = await fs.readFile(path.join(env.tmp.path, 'dist/assets', assets[0]), 'utf-8');
			// ensure all the CSS got merged:
			expect(css).toMatch(/body\s*,\s*html/);
			expect(css).toMatch(/\.app_\w+/);
			expect(css).toMatch(/\.home_\w+/);
			expect(css).toMatch(/\.profile_\w+/);

			const { address, stop } = serveStatic(path.join(env.tmp.path, 'dist'));
			cleanup.push(stop);

			const logs = [];
			function log(type, text) {
				logs.push(`${type}: ${text}`);
				console.log(`  ${type}: ${text}`);
			}
			env.page.on('console', m => log(m.type(), m.text()));
			env.page.on('error', err => log('error', err));
			env.page.on('pageerror', err => log('page error', err));

			const requests = [];
			await env.page.setCacheEnabled(false);
			await env.page.setRequestInterception(true);
			page.on('request', req => {
				requests.push(req.url().replace(/^https?:\/\/[^/]+/, ''));
				req.continue();
			});

			await env.page.goto(address, { waitUntil: ['domcontentloaded', 'networkidle2'] });
			expect(await env.page.content()).toMatch(/This is the home page/);

			expect(logs).toEqual([]);
			expect(requests.filter(url => /\.css$/.test(url))).toEqual([
				expect.stringMatching(/^\/assets\/style\.\w+\.css$/)
			]);

			logs.length = requests.length = 0;

			await env.page.goto(address + '/profile/foo', { waitUntil: ['domcontentloaded', 'networkidle2'] });
			expect(await env.page.content()).toMatch(/This is the profile page for foo/);

			expect(logs).toEqual([]);
			expect(requests.filter(url => /\.css$/.test(url))).toEqual([
				expect.stringMatching(/^\/assets\/style\.\w+\.css$/)
			]);
		});

		it('should merge duplicate CSS imports', async () => {
			await loadFixture('css-duplicates', env);
			instance = await runWmr(env.tmp.path, 'build');
			const code = await instance.done;
			console.info(instance.output.join('\n'));
			expect(code).toBe(0);

			const readdir = async f => (await fs.readdir(path.join(env.tmp.path, f))).filter(f => f[0] !== '.');
			const readfile = async f => await fs.readFile(path.join(env.tmp.path, f), 'utf-8');

			const dist = await readdir('dist');

			const chunks = await readdir('dist/chunks');
			expect(chunks).toEqual([expect.stringMatching(/^lazy\.\w+\.js$/)]);

			const assets = await readdir('dist/assets');
			// TODO: Rollup seems to randomly pick which asset ID to use for duplicated assets:
			expect(assets).toEqual([expect.stringMatching(/^[ab]\.\w+\.css$/)]);

			const css = await readfile('dist/assets/' + assets[0]);

			// ensure all the CSS properties got merged into a single rule:
			expect(css).toMatch(/a{[^{}]+}/);

			const properties = css.slice(2, -1).split(';').sort();
			expect(properties).toEqual(['color:#00f', 'color:red', 'text-decoration:underline']);

			const index = await readfile('dist/' + dist.find(f => f.match(/^index\.\w+\.js$/)));
			expect(index).toContain(`("/assets/${assets[0]}")`);
		});
	});

	describe('config.publicPath', () => {
		it('should respect `config.publicPath` value', async () => {
			await loadFixture('publicpath', env);
			instance = await runWmr(env.tmp.path, 'build');
			const code = await instance.done;
			console.info(instance.output.join('\n'));
			expect(code).toBe(0);

			const readdir = async f => (await fs.readdir(path.join(env.tmp.path, f))).filter(f => f[0] !== '.');

			const assets = await readdir('dist/assets');
			const chunks = await readdir('dist/chunks');
			const roots = await readdir('dist');

			expect(assets).toEqual([expect.stringMatching(/^index\.\w+\.css$/), expect.stringMatching(/^math\.\w+\.css$/)]);

			expect(chunks).toEqual([expect.stringMatching(/^constants\.\w+\.js$/), expect.stringMatching(/^math\.\w+\.js$/)]);

			expect(roots).toEqual(['assets', 'chunks', expect.stringMatching(/^index\.\w+\.js$/), 'index.html']);

			const html = await fs.readFile(path.join(env.tmp.path, 'dist', 'index.html'), 'utf8');
			const math = await fs.readFile(path.join(env.tmp.path, 'dist', 'chunks', chunks[1]), 'utf8');
			const main = await fs.readFile(path.join(env.tmp.path, 'dist', roots[2]), 'utf8');

			// https://cdn.example.com/assets/math.d41e7373.css
			expect(math).toMatch(`("https://cdn.example.com/assets/${assets[1]}")`);
			expect(math).toMatch(`import("./${chunks[0]}")`);

			// (preload) https://cdn.example.com/assets/math.d41e7373.css
			expect(main).toMatch(`$w_s$("https://cdn.example.com/assets/${assets[1]}")`);

			// HTML stylesheet: https://cdn.example.com/assets/index.0544f0a6.css
			expect(html).toMatch(`href="https://cdn.example.com/assets/${assets[0]}"`);

			// HTML script: https://cdn.example.com/assets/index.0544f0a6.css
			expect(html).toMatch(`src="https://cdn.example.com/${roots[2]}"`);
		});

		it('should respect `config.publicPath` value (ts)', async () => {
			await loadFixture('publicpath-typescript', env);
			instance = await runWmr(env.tmp.path, 'build');
			const code = await instance.done;
			console.info(instance.output.join('\n'));
			expect(code).toBe(0);

			const readdir = async f => (await fs.readdir(path.join(env.tmp.path, f))).filter(f => f[0] !== '.');

			const assets = await readdir('dist/assets');
			const chunks = await readdir('dist/chunks');
			const roots = await readdir('dist');

			expect(assets).toEqual([expect.stringMatching(/^index\.\w+\.css$/), expect.stringMatching(/^math\.\w+\.css$/)]);

			expect(chunks).toEqual([expect.stringMatching(/^constants\.\w+\.js$/), expect.stringMatching(/^math\.\w+\.js$/)]);

			expect(roots).toEqual(['assets', 'chunks', expect.stringMatching(/^index\.\w+\.js$/), 'index.html']);

			const html = await fs.readFile(path.join(env.tmp.path, 'dist', 'index.html'), 'utf8');
			const math = await fs.readFile(path.join(env.tmp.path, 'dist', 'chunks', chunks[1]), 'utf8');
			const main = await fs.readFile(path.join(env.tmp.path, 'dist', roots[2]), 'utf8');

			// https://cdn.example.com/assets/math.d41e7373.css
			expect(math).toMatch(`("https://cdn.example.com/assets/${assets[1]}")`);
			expect(math).toMatch(`import("./${chunks[0]}")`);

			// (preload) https://cdn.example.com/assets/math.d41e7373.css
			expect(main).toMatch(`$w_s$("https://cdn.example.com/assets/${assets[1]}")`);

			// HTML stylesheet: https://cdn.example.com/assets/index.0544f0a6.css
			expect(html).toMatch(`href="https://cdn.example.com/assets/${assets[0]}"`);

			// HTML script: https://cdn.example.com/assets/index.0544f0a6.css
			expect(html).toMatch(`src="https://cdn.example.com/${roots[2]}"`);
		});
	});

	describe('prerender', () => {
		/**
		 * @param {TestEnv} env
		 * @param {string} f
		 * @returns {Promise<string[]>}
		 */
		const readdir = async (env, f) => (await fs.readdir(path.join(env.tmp.path, f))).filter(f => f[0] !== '.');

		it('should support prerendered HTML, title & meta tags', async () => {
			await loadFixture('prod-head', env);
			instance = await runWmr(env.tmp.path, 'build', '--prerender');
			const code = await instance.done;
			console.info(instance.output.join('\n'));
			expect(code).toBe(0);

			const pages = await readdir(env, 'dist');

			expect(pages).toContain('index.html');
			expect(pages).toContain('other.html');

			const index = await fs.readFile(path.join(env.tmp.path, 'dist', 'index.html'), 'utf8');
			expect(index).toMatch('<title>Page: /</title>');
			expect(index).toMatch('<link rel="icon" href="data:,favicon-for-/">');
			expect(index).toMatch('<h1>page = /</h1>');
			expect(index).toMatch(`<meta property="og:title" content="Become an SEO Expert">`);

			const other = await fs.readFile(path.join(env.tmp.path, 'dist', 'other.html'), 'utf8');
			expect(other).toMatch('<title>Page: /other.html</title>');
			expect(other).toMatch('<link rel="icon" href="data:,favicon-for-/other.html">');
			expect(other).toMatch('<h1>page = /other.html</h1>');
			expect(other).toMatch(`<meta property="og:title" content="Become an SEO Expert">`);
		});

		it('should support prerendering json', async () => {
			await loadFixture('prod-prerender-json', env);
			instance = await runWmr(env.tmp.path, 'build', '--prerender');
			const code = await instance.done;
			console.info(instance.output.join('\n'));
			expect(code).toBe(0);

			const indexHtml = path.join(env.tmp.path, 'dist', 'index.html');
			const index = await fs.readFile(indexHtml, 'utf8');
			expect(index).toMatch(/{"foo":42,"bar":"bar"}/);
		});

		it('should not crash during prerendering', async () => {
			await loadFixture('prerender-crash', env);
			instance = await runWmr(env.tmp.path, 'build', '--prerender');
			const code = await instance.done;
			console.info(instance.output.join('\n'));
			expect(instance.output.join('\n')).toMatch(/Error: fail/);
			// Check if stack trace is present
			expect(instance.output.join('\n')).toMatch(/^\s+at\s\w+/gm);
			expect(code).toBe(1);
		});
	});

	describe('Code Splitting', () => {
		it('should support variables in dynamic import', async () => {
			await loadFixture('dynamic-import', env);
			instance = await runWmr(env.tmp.path, 'build', '--prerender');
			const code = await instance.done;
			expect(code).toBe(0);

			// make sure all the code ran during prerendering
			expect(instance.output).toContain(`hello from index.js`);
			expect(instance.output).toContain(`hello from page one`);
			expect(instance.output).toContain(`hello from page two`);
			expect(instance.output).toContain(`loaded pages`);
			expect(instance.output).toContain(`page one,page two`);

			const readdir = async f => (await fs.readdir(path.join(env.tmp.path, f))).filter(f => f[0] !== '.');

			const root = await readdir('dist');
			expect(root).toContain('chunks');

			const chunks = await readdir('dist/chunks');
			expect(chunks).toEqual([expect.stringMatching(/^one\.\w+\.js$/), expect.stringMatching(/^two\.\w+\.js$/)]);

			const { address, stop } = serveStatic(path.join(env.tmp.path, 'dist'));
			cleanup.push(stop);

			const logs = [];
			env.page.on('console', m => logs.push(m.text()));

			await env.page.goto(address, {
				waitUntil: ['networkidle0', 'load']
			});

			expect(logs).toEqual([
				`hello from index.js`,
				// Pages "one" and "two" are loaded in parallel. So we have no
				// guarantee which one will be done loading first.
				expect.stringMatching(/^hello from page (one|two)$/),
				expect.stringMatching(/^hello from page (one|two)$/),
				`loaded pages`,
				`page one,page two`
			]);
		});
	});

	describe('Prerender', () => {
		it.only('should remove search params', async () => {
			await loadFixture('prod-routes', env);
			instance = await runWmr(env.tmp.path, 'build', '--prerender', '--stream');
			const code = await instance.done;
			console.log(instance.output);
			expect(code).toBe(0);

			const readdir = async f => (await fs.readdir(path.join(env.tmp.path, f))).filter(f => f[0] !== '.');

			const root = await readdir('dist');
			expect(root).toContain('about');

			const chunks = await readdir('dist/about');
			expect(chunks).toEqual(['index.html']);
		});
	});
});
