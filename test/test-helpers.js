import puppeteer from 'puppeteer';
import tmp from 'tmp-promise';
import path from 'path';
import ncpCb from 'ncp';
import childProcess from 'child_process';
import { promisify } from 'util';

const ncp = promisify(ncpCb);

export async function startBrowser() {
	const browser = await puppeteer.launch();
	const page = await browser.newPage();
	return { browser, page };
}

/**
 * @typedef {{ tmp: import('tmp-promise').DirectoryResult, browser: import('puppeteer').Browser, page: import('puppeteer').Page}} TestEnv
 */

/**
 * @returns {Promise<TestEnv>}
 */
export async function setupTest() {
	const browser = await startBrowser();
	const cwd = await tmp.dir({
		unsafeCleanup: true
	});
	return { tmp: cwd, ...browser };
}

/**
 * @param {TestEnv} env
 */
export async function teardown(env) {
	await env.browser.close();
	await env.tmp.cleanup();
}

/**
 * @param {string} name
 * @param {TestEnv} env
 */
export async function loadFixture(name, env) {
	const fixture = path.join(__dirname, 'fixtures', name);
	await ncp(fixture, env.tmp.path);
}

/** @typedef {{output: string[], code: number, close: () => void}} WmrInstance */

/**
 * @param {string} cwd
 * @param {...string[]} args
 * @returns {WmrInstance}
 */
export async function runWmr(cwd, ...args) {
	const bin = path.join(__dirname, '..', 'src', 'cli.js');
	const child = childProcess.spawn('node', [bin, ...args], {
		cwd
	});

	const out = {
		output: [],
		code: 0,
		close: () => child.kill()
	};

	child.stdout.on('data', buffer => {
		const raw = buffer.toString();
		const lines = raw.split('\n');
		out.output.push(...lines);
	});
	child.stderr.on('data', buffer => {
		const raw = buffer.toString();
		const lines = raw.split('\n');
		out.output.push(...lines);
	});
	child.on('close', code => (out.code = code));

	await waitFor(() => out.output.length > 0, 10000);

	return out;
}

/**
 * @param {number} ms
 */
export const wait = ms => new Promise(r => setTimeout(r, ms));

/**
 * @param {() => boolean | Promise<boolean>} fn
 * @param {number} timeout
 * @returns {boolean}
 */
export async function waitFor(fn, timeout = 2000) {
	const start = Date.now();

	while (start + timeout >= Date.now()) {
		const result = await fn();
		if (result) return true;

		// Wait a little before the next iteration
		await wait(10);
	}

	return false;
}

/**
 * @param {string[]} haystack
 * @param {string | RegExp} message
 * @param {number} timeout
 * @returns {Promise<void>}
 */
export async function waitForMessage(haystack, message, timeout = 5000) {
	const found = await waitFor(() => {
		if (typeof message === 'string') {
			if (haystack.includes(message)) {
				return true;
			}
		} else {
			for (let i = 0; i < haystack.length; i++) {
				if (message.test(haystack[i])) {
					return true;
				}
			}
		}

		return false;
	});

	if (!found) {
		throw new Error(`Message ${message} didn't appear in ${timeout}ms`);
	}
}
