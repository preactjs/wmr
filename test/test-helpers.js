import tmp from 'tmp-promise';
import path from 'path';
import ncpCb from 'ncp';
import childProcess from 'child_process';
import { promisify } from 'util';
import { get as httpGet } from 'http';

const ncp = promisify(ncpCb);

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
	await ncp(fixture, env.tmp.path);
}

/**
 * @param {string} cwd
 * @param {...string} args
 * @returns {Promise<WmrInstance>}
 */
export async function runWmr(cwd, ...args) {
	let opts = {};
	const lastArg = args[args.length - 1];
	if (lastArg && typeof lastArg === 'object') {
		opts = args.pop();
	}
	const bin = path.join(__dirname, '..', 'src', 'cli.js');
	const child = childProcess.spawn('node', ['--experimental-modules', bin, ...args], {
		cwd,
		...opts,
		env: {
			...process.env,
			DEBUG: 'true',
			...(opts.env || {})
		}
	});

	const out = {
		output: [],
		code: 0,
		address: null,
		close: () => child.kill()
	};

	function onOutput(buffer) {
		const raw = stripColors(buffer.toString('utf-8'));
		const lines = raw.split('\n').filter(line => !/\(node:\d+\) ExperimentalWarning:/.test(line) && line);
		out.output.push(...lines);
		if (/\b([A-Z][a-z]+)?Error\b/m.test(raw)) {
			console.error(`Error running "wmr ${args.join(' ')}":\n${raw}`);
		}
		if (/^Listening/m.test(raw)) {
			let m = raw.match(/https?:\/\/localhost:\d+/g);
			if (m) setAddress(m[0]);
		}
	}
	child.stdout.on('data', onOutput);
	child.stderr.on('data', onOutput);
	child.on('close', code => (out.code = code));

	let setAddress;
	out.address = new Promise(resolve => (setAddress = resolve));

	await waitFor(() => out.output.length > 0, 10000);

	return out;
}

// eslint-disable-next-line no-control-regex
const stripColors = str => str.replace(/\x1b\[(?:[0-9]{1,3}(?:;[0-9]{1,3})*)?[m|K]/g, '');

/**
 * @param {number} ms
 * @returns {Promise<void>}
 */
export const wait = ms => new Promise(r => setTimeout(r, ms));

/**
 * @param {() => boolean | Promise<boolean>} fn
 * @param {number} timeout
 * @returns {Promise<boolean>}
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
				if (res.statusCode >= 400) {
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
