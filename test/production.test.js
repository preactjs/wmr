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

	describe('demo app', () => {
		it('should serve the demo app', async () => {
			await loadFixture('../../demo', env);
			for (const d of ['dist', 'node_modules', '.cache']) {
				await fs.rmdir(path.join(env.tmp.path, d), { recursive: true });
			}
			instance = await runWmr(env.tmp.path, 'build');
			const code = await instance.done;
			const output = instance.output.join('\n');
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
			expect(logs).toEqual([]);

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
});
