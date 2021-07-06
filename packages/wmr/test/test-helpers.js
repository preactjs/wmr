import tmp from 'tmp-promise';
import path from 'path';
import { promises as fs } from 'fs';
import ncpCb from 'ncp';
import childProcess from 'child_process';
import { promisify } from 'util';
import { get as httpGet } from 'http';
import polka from 'polka';
import sirv from 'sirv';
import { isDirectory } from '../src/lib/fs-utils.js';

export function dent(str) {
	str = String(str);
	const leading = str.match(/^\n+([\t ]+)/)[1];
	return str.replace(new RegExp('^' + leading, 'gm'), '').trim();
}

const ncp = promisify(ncpCb);

export function serveStatic(dir) {
	const app = polka()
		.use(sirv(dir, { dev: true, single: true }))
		.listen(0);
	// @ts-ignore-next
	const server = app.server;
	return {
		address: `http://localhost:${server.address().port}`,
		stop: () => server.close()
	};
}

/**
 * @returns {Promise<TestEnv>}
 */
export async function setupTest() {
	const cwdPromise = tmp.dir({ unsafeCleanup: true });
	await jestPuppeteer.resetPage();
	return { tmp: await cwdPromise, browser, page };
}

/**
 * @param {TestEnv} env
 */
export async function teardown(env) {
	await env.tmp.cleanup();
}

/**
 * @param {string} name
 * @param {TestEnv} env
 */
export async function loadFixture(name, env) {
	const fixture = path.join(__dirname, 'fixtures', name);

	// Ensure fixture name is included for parent alias tests
	env.tmp.path = path.join(env.tmp.path, path.basename(name));
	await fs.mkdir(env.tmp.path, { recursive: true });

	await ncp(fixture, env.tmp.path);

	// Delete copied .cache folder
	const cacheDir = path.join(env.tmp.path, '.cache');
	if (await isDirectory(cacheDir)) {
		await fs.rmdir(cacheDir, { recursive: true });
	}

	try {
		await fs.mkdir(path.join(env.tmp.path, 'node_modules', 'wmr'), { recursive: true });
		await fs.mkdir(path.join(env.tmp.path, 'node_modules', '@wmrjs', 'directory-import', 'src'), { recursive: true });
	} catch (err) {
		if (!/EEXIST/.test(err.message)) {
			throw err;
		}
	}

	// Copy fake wmr node_modules over
	await fs.copyFile(path.join(__dirname, '..', 'index.js'), path.join(env.tmp.path, 'node_modules', 'wmr', 'index.js'));
	await fs.copyFile(
		path.join(__dirname, '..', 'package.json'),
		path.join(env.tmp.path, 'node_modules', 'wmr', 'package.json')
	);

	await fs.copyFile(
		path.join(__dirname, '..', '..', 'directory-plugin', 'src', 'index.js'),
		path.join(env.tmp.path, 'node_modules', '@wmrjs', 'directory-import', 'src', 'index.js')
	);
	await fs.copyFile(
		path.join(__dirname, '..', '..', 'directory-plugin', 'package.json'),
		path.join(env.tmp.path, 'node_modules', '@wmrjs', 'directory-import', 'package.json')
	);
}

/**
 * @param {string} cwd
 * @param {[...string[], string | Record<string, any>]} args
 * @returns {Promise<WmrInstance>}
 */
export async function runWmr(cwd, ...args) {
	let opts = {};
	const lastArg = args[args.length - 1];
	if (lastArg && typeof lastArg === 'object') {
		opts = args.pop() || opts;
	}
	// Allow running tests against the fully built/bundled version of WMR:
	if (process.env.PRODUCTION_BUILD === 'true') {
		const bin = path.join(__dirname, '..', 'wmr.cjs');
		args.unshift(bin);
	} else {
		// run tests against the original Node ESM source by default:
		const bin = path.join(__dirname, '..', 'src', 'cli.js');
		args.unshift('--experimental-modules', bin);
	}
	const child = childProcess.spawn('node', args, {
		cwd,
		...opts,
		env: {
			...process.env,
			DEBUG: 'true',
			PORT: '0',
			...(opts.env || {})
		}
	});

	const out = {};
	out.output = [];
	out.code = 0;
	out.close = () => child.kill();

	function onOutput(buffer) {
		const raw = stripColors(buffer.toString('utf-8'));
		const lines = raw.split('\n').filter(line => !/\(node:\d+\) ExperimentalWarning:/.test(line) && line);
		out.output.push(...lines);
		// Bubble up errors, but not 404's
		if (/\b([A-Z][a-z]+)?Error\b/m.test(raw) && !/^404 /.test(raw)) {
			console.error(`Error running "wmr ${args.join(' ')}":\n${raw}`);
		}
		if (/server running at/m.test(raw)) {
			let m = raw.match(/https?:\/\/localhost:\d+/g);
			if (m) setAddress(m[0]);
		}
	}
	child.stdout.on('data', onOutput);
	child.stderr.on('data', onOutput);
	out.done = new Promise(resolve => {
		child.on('close', code => resolve((out.code = code)));
	});

	let setAddress;
	out.address = new Promise(resolve => (setAddress = resolve));

	await waitFor(() => out.output.length > 0, 10000);

	return out;
}

export const runWmrFast = (cwd, ...args) => runWmr(cwd, '--no-optimize', '--no-compress', ...args);

const addrs = new WeakMap();

export async function getOutput(env, instance) {
	let address = addrs.get(instance);
	if (!address) {
		await waitForMessage(instance.output, /server running at/);
		address = instance.output.join('\n').match(/https?:\/\/localhost:\d+/g)[0];
		addrs.set(instance, address);
	}

	await waitForPass(async () => {
		await env.page.goto(address);
	}, 5000);
	return await env.page.content();
}

// eslint-disable-next-line no-control-regex
const stripColors = str => str.replace(/\x1b\[(?:[0-9]{1,3}(?:;[0-9]{1,3})*)?[m|K]/g, '');

/**
 * @param {number} ms
 * @returns {Promise<void>}
 */
export const wait = ms => new Promise(r => setTimeout(r, ms));

/**
 * Pupppeteer often throws when the pages is navigated and we try
 * to assert something. Ignore any errors when that happens.
 * See: https://github.com/boxine/pentf/blob/c046f5275ae7201a427b9dc30965d633855bb3be/src/utils.js#L259
 * @param {Error} err
 * @returns {boolean}
 */
function ignoreError(err) {
	return /Execution context was destroyed|(Session|Connection|Target) closed/.test(err.message);
}

/**
 * @param {() => boolean | Promise<boolean>} fn
 * @param {number} timeout
 * @returns {Promise<boolean>}
 */
export async function waitFor(fn, timeout = 2000) {
	const start = Date.now();

	while (start + timeout >= Date.now()) {
		try {
			const result = await fn();
			if (result) return true;
		} catch (err) {
			if (!ignoreError(err)) {
				throw err;
			}
		}

		// Wait a little before the next iteration
		await wait(10);
	}

	return false;
}

/**
 * Wait until a function doesn't throw anymmore
 * @param {() => any} fn
 * @param {number} timeout
 * @returns {Promise<void>}
 */
export async function waitForPass(fn, timeout = 2000) {
	const start = Date.now();

	let error;
	while (start + timeout >= Date.now()) {
		try {
			await fn();
			return;
		} catch (err) {
			if (!ignoreError(err)) {
				error = err;
			}
		}

		// Wait a little before the next iteration
		await wait(10);
	}

	throw error ? error : new Error(`waitForPass timed out. Waited ${timeout}ms`);
}

/**
 * @param {string[]} haystack
 * @param {string | RegExp} message
 * @param {number} [timeout]
 * @returns {Promise<void>}
 */
export async function waitForMessage(haystack, message, timeout = 5000) {
	const found = await waitFor(() => {
		if (typeof message === 'string') {
			if (haystack.some(line => line.includes(message))) {
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
		throw new Error(`Message ${message} didn't appear in ${timeout}ms\n\nActual output:\n\n${haystack.join('\n')}`);
	}
}

/**
 * @param {string[]} haystack
 * @param {string | RegExp} message
 * @param {number} [timeout]
 * @returns {Promise<void>}
 */
export async function waitForNotMessage(haystack, message, timeout = 1000) {
	try {
		await waitForMessage(haystack, message, timeout);
		throw new Error(`Expected message to not be present: ${message}`);
	} catch (err) {}
}

/**
 * Print haystack when `fn` throws
 * @param {string[]} haystack
 * @param {() => any} fn
 */
export async function withLog(haystack, fn) {
	try {
		await fn();
	} catch (err) {
		// eslint-disable-next-line no-console
		console.log(haystack.join('\n'));
		throw err;
	}
}

/**
 * Update the contents of a file. Useful for HMR or watch tests
 * @param {string} tempDir Path to the temporary fixture directory
 * @param {string} file filename or fiel path
 * @param {(content: string) => string} replacer callback to replace content
 * @returns {Promise<void>}
 */
export async function updateFile(tempDir, file, replacer) {
	const compPath = path.join(tempDir, file);
	const content = await fs.readFile(compPath, 'utf-8');
	await fs.writeFile(compPath, replacer(content));
}

/**
 * @param {WmrInstance} instance
 * @param {string} urlPath
 * @returns {Promise<{status?: number, body: string, res: import('http').IncomingMessage }>}
 */
export async function get(instance, urlPath) {
	const addr = await instance.address;
	return new Promise((resolve, reject) => {
		httpGet(addr + '/' + urlPath.replace(/^\//, ''), res => {
			let body = '';
			res.setEncoding('utf-8');
			res.on('data', chunk => {
				body += chunk;
			});
			res.once('end', () => {
				if (!res.statusCode || res.statusCode >= 400) {
					const err = Object.assign(Error(`${res.statusCode} ${res.statusMessage}: ${urlPath}\n${body}`), {
						code: res.statusCode,
						body,
						res
					});
					return reject(err);
				}
				resolve({
					status: res.statusCode,
					body,
					res
				});
			});
		});
	});
}
