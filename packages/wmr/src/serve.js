import * as kl from 'kolorist';
import polka from 'polka';
import { normalizeOptions } from './lib/normalize-options.js';
import { getFreePort, getServerAddresses } from './lib/net-utils.js';
import { createServer } from 'http';
import { createHttp2Server } from './lib/http2.js';
import compression from './lib/polkompress.js';
import sirv from 'sirv';
import { formatBootMessage } from './lib/output-utils.js';

/**
 * @typedef CustomServer
 * @type {polka.Polka & { server?: ReturnType<createServer> | import('http2').Http2Server, http2?: boolean } }
 */

/**
 * @typedef ServeOptions
 * @property {string} [out='./dist']
 * @property {string} [cwd='.']
 * @property {string} [host]
 * @property {string} [port]
 * @property {boolean} [http2]
 * @property {boolean|number} [compress]
 * @property {polka.Middleware[]} [middleware] Additional Polka middlewares to inject
 * @property {Record<string, string>} [env]
 */

/**
 * @param {ServeOptions} options
 */
export default async function serve(options = {}) {
	options.out = options.out || 'dist';

	options = await normalizeOptions(options, 'serve');

	/** @type {CustomServer} */
	const app = polka({
		onError(err, req, res) {
			const fullPath = req.originalUrl.replace(/\?.+$/, '');

			let code = 500;
			let msg = '';
			if (err) {
				if (typeof err.code === 'number') code = err.code;
				if (err.message) {
					msg = err.message;
				} else if (String(Object.keys(err)) === 'code') {
					// sirv throws a `{code:404}` POJO
					msg = code === 404 ? 'Not Found' : `Error ${code}`;
				} else {
					msg = String(err);
				}
			}
			res.writeHead(code, { 'content-type': 'text/plain' });
			res.end(msg);
			console.error(`${kl.yellow(code)} ${kl.bold(fullPath)} ${msg ? ` - ${msg}` : ''}`);
		}
	});

	if (options.compress) {
		const threshold = options.compress === true ? 1024 : options.compress;
		app.use(compression({ threshold }));
	}

	if (options.middleware && options.middleware.length) {
		app.use(...options.middleware);
	}

	app.use(
		sirv(options.out, {
			single: true,
			etag: true,
			brotli: false,
			gzip: false,
			setHeaders(res, pathname) {
				// Ensure a UTF8 charset (because we set Nosniff)
				const fn = res.setHeader;
				res.setHeader = function (name, value) {
					if (/^content-type$/i.test(name) && /text/i.test(value) && !/;\s*charset/i.test(value)) {
						value += ';charset=utf-8';
					}
					return fn.call(this, name, value);
				};
			}
		})
	);

	if (options.http2) {
		try {
			app.server = await createHttp2Server();
			app.http2 = true;
		} catch (e) {
			console.error(`Unable to create HTTP2 server, falling back to HTTP1:\n${e}`);
		}
	}
	if (!app.server) {
		app.server = createServer();
		app.http2 = false;
	}

	const port = await getFreePort(options.port || process.env.PORT || 8080);
	const host = options.host || process.env.HOST;
	app.listen(port, host, () => {
		const addresses = getServerAddresses(app.server.address(), { https: app.http2 });

		const message = `dev server running at:`;
		process.stdout.write(formatBootMessage(message, addresses));
	});
}
