import { join, resolve } from 'path';
import { fileURLToPath } from 'url';
import { fork } from 'child_process';

/**
 * @param {{ cwd: string, root?: string, port?: number, http2?: boolean }} options
 * @returns {(req: Pick<import('http').IncomingMessage, 'method'|'headers'|'url'|'path'>, res: import('http').ServerResponse, next:Function) => void}
 */
export default function ssrMiddleware({ cwd, root, port, http2 }) {
	root = root || cwd;
	port = port || Number(process.env.PORT) || 8080;
	const baseURL = `http${http2 ? 's' : ''}://0.0.0.0:${port}`;

	// const ssr = fork(baseURL + '/ssr.js', [], {
	// const ssr = fork('/ssr.js', [], {
	const ssr = fork(join(cwd, 'ssr.js'), [], {
		stdio: 'inherit',
		execArgv: [
			'--experimental-modules',
			'--experimental-loader',
			resolve(fileURLToPath(import.meta.url), '../../../_ssr.js')
		],
		env: {
			WMRSSR_HOST: baseURL,
			NODE_TLS_REJECT_UNAUTHORIZED: '0'
		}
	});
	ssr.on('error', console.error);
	ssr.once('exit', process.exit);

	let c = 0;
	const p = new Map();
	function deferred() {
		const deferred = {};
		deferred.promise = new Promise((resolve, reject) => {
			deferred.resolve = resolve;
			deferred.reject = reject;
		});
		return deferred;
	}
	const ready = deferred();
	async function rpc(fn, ...args) {
		await ready.promise;
		const id = ++c;
		const controller = deferred();
		p.set(id, controller);
		ssr.send([id, fn, ...args]);
		return controller.promise;
	}
	ssr.on('message', data => {
		// console.log('parent message: ', data);
		if (data === 'init') {
			return ready.resolve();
		}
		if (!Array.isArray(data)) {
			return console.log('unknown message: ', data);
		}
		// console.log(data);
		const [id, fn, ...args] = data;
		if (fn === '$resolve$') p.get(id).resolve(args[0]);
		else if (fn === '$reject$') p.get(id).reject(args[0]);
		else if (fn === 'setHeader') {
			const res = responses.get(args[0]);
			if (!res || res.headersSent) return;
			if (typeof args[1] === 'object') {
				for (let i in args[1]) {
					res.setHeader(i, args[1][i]);
				}
			} else {
				res.setHeader(args[1], args[2]);
			}
			return;
		} else if (fn === 'flush') {
			const res = responses.get(args[0]);
			if (res && !res.headersSent && res.flush) setTimeout(res.flush, 1);
			return;
		} else {
			console.log('[SSR] Unknown RPC host method: ', fn, '(', ...args, ') [', id, ']');
		}
	});
	ssr.on('error', ready.reject);

	let requestIdCounter = 0;
	const responses = new Map();

	return async (req, res, next) => {
		if (!/text\/html/.test(req.headers.accept + '')) {
			return next();
		}
		const requestId = ++requestIdCounter;
		responses.set(requestId, res);
		try {
			let result = await rpc(['ssr', 'default'], {
				requestId,
				url: req.url,
				path: req.path,
				headers: req.headers
			});
			if (typeof result === 'string') {
				result = { html: result };
			}
			if (!res.headersSent) {
				res.writeHead(
					result.status || 200,
					Object.assign(
						{
							'content-type': 'text/html'
						},
						result.headers
					)
				);
			}
			res.end(result.html);
		} catch (e) {
			next(new Error(`SSR(${req.url}) Error: ${e}`));
		} finally {
			responses.delete(requestId);
		}
	};
}
