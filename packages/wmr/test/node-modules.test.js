import path from 'path';
import { promises as fs } from 'fs';
import {
	setupTest,
	teardown,
	loadFixture,
	runWmrFast,
	getOutput,
	get,
	waitForMessage,
	waitForNotMessage,
	waitFor,
	withLog,
	waitForPass,
	updateFile
} from './test-helpers.js';
import { rollup } from 'rollup';
import nodeBuiltinsPlugin from '../src/plugins/node-builtins-plugin.js';
import { supportsSearchParams } from '../src/lib/net-utils.js';
import { rm } from '../src/lib/fs-utils.js';

jest.setTimeout(30000);

describe('node-modules', () => {
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

	it('should load CSS files that are imported from js files', async () => {
		await loadFixture('node-modules-css', env);
		instance = await runWmrFast(env.tmp.path);
		await getOutput(env, instance);

		await withLog(instance.output, async () => {
			await waitForPass(async () => {
				const color = await env.page.$eval('h1', el => getComputedStyle(el).color);

				await new Promise(r => setTimeout(r, 4000));
				expect(color).toBe('rgb(255, 0, 0)');
			});
		});
	});
});
