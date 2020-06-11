import sirv from 'sirv';
import polka from 'polka';
import { createServer } from 'http';
import { createSecureServer } from 'http2';
import compression from './lib/polkompress.js';
import devcert from 'devcert';
import npmMiddleware from './lib/npm-middleware.js';
import WebSocketServer from './lib/websocket-server.js';

async function createHttp2Server(options = {}) {
	const host = process.env.HOST || 'localhost';
	const { key, cert } = await devcert.certificateFor(host);

	const server = createSecureServer({
		key,
		cert,
		allowHTTP1: true, // required for websockets
		...options
	});

	return server;
}

/**
 * @typedef CustomServer
 * @type {polka.Polka & { server?: ReturnType<createServer> | import('http2').Http2Server, ws?: WebSocketServer } }
 */

/**
 * @param {object} [options]
 * @param {string} [options.cwd = ''] Directory to serve
 * @param {string} [options.overlayDir] A directory of generated files to serve if present
 * @param {polka.Middleware[]} [options.middleware] Additional Polka middlewares to inject
 * @param {boolean} [options.http2 = false] Use HTTP/2
 * @param {boolean|number} [options.compress = true] Compress responses? Pass a `number` to set the size threshold.
 */
export default async function server({ cwd, overlayDir, middleware, http2 = false, compress = true } = {}) {
	/** @type {CustomServer} */
	const app = polka({
		onError(err, req, res) {
			// ignore missing favicon requests
			if (req.path == '/favicon.ico') return res.end();

			const code = typeof err.code === 'number' ? err.code : 500;
			res.writeHead(code, { 'content-type': 'text/plain' });
			res.end(err + '');
			console.error(err);
		}
	});

	if (http2) {
		try {
			app.server = await createHttp2Server();
		} catch (e) {
			console.error(`Unable to create HTTP2 server, falling back to HTTP1:\n${e}`);
		}
	}
	if (!app.server) {
		app.server = createServer();
	}

	app.ws = new WebSocketServer(app.server, '/_hmr');

	if (compress) {
		// @TODO: reconsider now that npm deps are compressed AOT
		const threshold = compress === true ? 1024 : compress;
		app.use(compression({ threshold, level: 4 }));
	}

	app.use('/@npm', npmMiddleware());

	if (middleware) {
		app.use(...middleware);
	}

	if (overlayDir) {
		app.use(sirv(overlayDir, { dev: true }));
	}

	// SPA nav fallback
	app.use(
		sirv(cwd || '', {
			ignores: ['@npm'],
			single: true,
			dev: true
		})
	);

	return app;
}
