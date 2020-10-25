import { join } from 'path';
import { fileURLToPath } from 'url';
import { fork } from 'child_process';

/**
 * @param {{ cwd: string, root?: string, port?: number, http2?: boolean, ssr?: boolean|string }} options
 * @returns {(req: Pick<import('http').IncomingMessage, 'method'|'headers'|'url'|'path'>, res: import('http').ServerResponse, next:Function) => void}
 */
export default function ssrMiddleware(options) {
	const RPC_METHODS = {
		setHeader(requestId, name, value) {
			const res = responses.get(requestId);
			if (!res || res.headersSent) return;
			if (typeof name === 'object') {
				for (let i in name) {
					res.setHeader(i, name[i]);
				}
			} else {
				res.setHeader(name, value);
			}
		},
		flush(requestId) {
			const res = responses.get(requestId);
			if (!res || res.headersSent || !res.flush) return;
			res.writeHead(200);
			setTimeout(res.flush, 1);
		},
		_unknown(fn, args) {
			console.log('[SSR] Unknown RPC host method: ' + fn + '(', ...args, ')');
		}
	};

	// Slightly defer initialization to ensure `options.port` reflects automatic port selection.
	function init() {
		if (worker) return;
		let { port, cwd, ssr, http2 } = options;
		port = port || Number(process.env.PORT) || 8080;
		worker = createWorker({
			entry: join(cwd, typeof ssr === 'string' ? ssr : 'ssr.js'),
			baseURL: `http${http2 ? 's' : ''}://0.0.0.0:${port}`,
			http2,
			methods: RPC_METHODS
		});
	}
	setTimeout(init, 50);

	let worker;
	let requestIdCounter = 0;
	const responses = new Map();

	return async (req, res, next) => {
		// only handle navigation requests
		if (!/text\/html/.test(req.headers.accept + '') || /(\?asset|\.[a-z]+$|^\/@npm)/.test(req.url + '')) {
			return next();
		}

		// ensure the worker is initialized
		init();

		const requestId = ++requestIdCounter;
		responses.set(requestId, res);
		res.setHeader('Content-Type', 'text/html; charset=utf-8');
		res.setHeader('X-Content-Type-Options', 'nosniff');

		try {
			let result = await worker.rpc(['ssr', 'default'], {
				requestId,
				url: req.url,
				path: req.path,
				headers: req.headers
			});
			if (typeof result === 'string') {
				result = { html: result };
			}
			if (!res.headersSent) {
				res.writeHead(result.status || 200, result.headers);
			}
			res.end(result.html);
		} catch (e) {
			next(new Error(`SSR(${req.url}) Error: ${e}`));
		} finally {
			responses.delete(requestId);
		}
	};
}

function createWorker({ entry, baseURL, http2, methods = {} }) {
	let rpcCounter = 0;
	const p = new Map();
	const ready = deferred();

	const proc = fork(entry, [], {
		stdio: 'inherit',
		execArgv: [
			// force ESM to be enabled in Node 12
			'--experimental-modules',
			// enable the Loader API in Node 12+
			'--experimental-loader',
			fileURLToPath(new URL('./loader.js', import.meta.url).href)
			// resolve(fileURLToPath(import.meta.url), '../../../_ssr.js')
		],
		env: {
			WMRSSR_HOST: baseURL,
			NODE_TLS_REJECT_UNAUTHORIZED: http2 ? '0' : undefined
		}
	});
	proc.on('error', console.error);
	proc.once('exit', process.exit);
	proc.on('error', ready.reject);
	proc.on('message', data => {
		if (data === 'init') return ready.resolve();
		if (!Array.isArray(data)) return console.log('unknown message: ', data);
		const [id, fn, ...args] = data;
		if (fn === '$resolve$') return p.get(id).resolve(args[0]);
		if (fn === '$reject$') return p.get(id).reject(args[0]);
		const ret = Promise.resolve().then(() => (methods[fn] || methods._unknown)(...args));
		if (typeof id === 'number' && id > 0) {
			ret.then(
				ret => proc.send([id, '$resolve$', ret]),
				err => proc.send([id, '$reject$', String(err)])
			);
		}
	});

	async function rpc(fn, ...args) {
		await ready.promise;
		const id = ++rpcCounter;
		const controller = deferred();
		p.set(id, controller);
		proc.send([id, fn, ...args]);
		return controller.promise;
	}

	return { proc, rpc, methods };
}

function deferred() {
	const deferred = {};
	deferred.promise = new Promise((resolve, reject) => {
		deferred.resolve = resolve;
		deferred.reject = reject;
	});
	return deferred;
}
