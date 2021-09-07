import { Worker } from 'worker_threads';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/**
 * @param {object} options
 * @property {string} [cwd = '.']
 * @property {string} [out = '.cache']
 * @property {string} publicPath
 * @property {any[]} customRoutes
 */
export function prerender({ cwd = '.', out = '.cache', publicPath, customRoutes }) {
	let w;
	try {
		debugger;
		w = new Worker(path.join(__dirname, './prerender-worker.js'), {
			// eval: true,
			workerData: { cwd, out, publicPath, customRoutes },
			stderr: true,
			stdout: true

			// execArgv: ['--experimental-modules'],
			// stderr: true
		});
	} catch (e) {
		throw Error(
			`Failed to prerender, Workers aren't supported in your current Node.JS version (try v14 or later).\n  ${e}`
		);
	}

	w.stdout.on('data', m => {
		console.log(m);
	});

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
		w.on('message', ([f, d]) => {
			console.log('message', f, d);
			f ? resolve(d) : bubbleError(d);
		});
		w.once('error', bubbleError);
		w.once('exit', code => {
			console.log('worker exit', code);
		});
	});
}
