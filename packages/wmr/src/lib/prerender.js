import { Worker } from 'worker_threads';
import path from 'path';
import { fileURLToPath } from 'url';

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
		w = new Worker(path.join(__dirname, `prerender-worker.js`), {
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
