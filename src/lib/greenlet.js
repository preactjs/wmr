import { Worker } from 'worker_threads';

/**
 * @template {(...args: any) => any} T
 * @param {T} fn
 * @returns {(...args: Parameters<T>) => Promise<ReturnType<T> extends Promise<infer R> ? R : ReturnType<T>>}
 */
export default function greenlet(fn) {
	let n = 0,
		t = {};
	function a(port, fn) {
		port.on('message', async ([id, params]) => {
			try {
				port.postMessage([id, 0, await fn(...params)]);
			} catch (e) {
				// port.postMessage([id, 1, (e && e.stack) || e + '']);
				port.postMessage([id, 1, String(e)]);
				// throw e;
			}
		});
	}
	function g(...args) {
		return new Promise((s, f) => ((t[++n] = [s, f]), w.postMessage([n, args])));
	}
	g.terminate = () => w.terminate();
	let w = (g.worker = new Worker(`(${a})(require('worker_threads').parentPort,${fn})`, { eval: true }));
	w.on('message', ([id, x, result]) => (t[id] = t[id][x](result)));
	return g;
}
