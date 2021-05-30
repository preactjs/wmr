import { Worker } from 'worker_threads';
import path from 'path';
import { fileURLToPath } from 'url';
import { isFile } from './fs-utils.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/**
 * @param {object} options
 * @property {string} [cwd = '.']
 * @property {string} [out = '.cache']
 * @property {string} publicPath
 */
export async function prerender({ cwd = '.', out = '.cache', publicPath }) {
	let w;
	try {
		// Files will have different names when we build wmr itself
		const filename = (await isFile(path.join(__dirname, 'prerender-worker.cjs')))
			? path.join(__dirname, 'prerender-worker.cjs')
			: path.join(__dirname, 'prerender-worker.js');

		w = new Worker(filename, {
			workerData: { cwd, out, publicPath },
			// execArgv: ['--experimental-modules'],
			stderr: true
		});
	} catch (e) {
		throw Error(
			`Failed to prerender, Workers aren't supported in your current Node.JS version (try v14 or later).\n  ${e}`
		);
	}

	// @ts-ignore-next
	w.stderr.on('data', m => {
		if (!/^\(node:\d+\) ExperimentalWarning:/.test(m.toString('utf-8'))) process.stderr.write(m);
	});
	return new Promise((resolve, reject) => {
		const bubbleError = error => {
			if (typeof error === 'string') {
				const err = new Error('Prerendering Error: ' + error.replace(/\n {4}at [\s\S]+$/g, ''));
				err.stack = error;
				return reject(err);
			}
			reject(error);
		};
		w.on('message', ([f, d]) => (f ? resolve(d) : bubbleError(d)));
		w.once('error', bubbleError);
		w.once('exit', resolve);
	});
}
