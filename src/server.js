import { resolve } from 'path';
import { createServer } from 'http';
import polka from 'polka';
import sirv from 'sirv';
import compression from './lib/polkompress.js';
import npmMiddleware from './lib/npm-middleware.js';
import WebSocketServer from './lib/websocket-server.js';

/**
 * @typedef CustomServer
 * @type {polka.Polka & { server?: ReturnType<createServer> | import('http2').Http2Server, ws?: WebSocketServer, http2?: boolean } }
 */

/**
 * @param {object} [options]
 * @param {string} [options.cwd = ''] Directory to serve
 * @param {string} [options.publicDir] A directory containing public files, relative to cwd
 * @param {string} [options.overlayDir] A directory of generated files to serve if present, relative to cwd
 * @param {polka.Middleware[]} [options.middleware] Additional Polka middlewares to inject
 * @param {boolean} [options.http2 = false] Use HTTP/2
 * @param {boolean|number} [options.compress = true] Compress responses? Pass a `number` to set the size threshold.
 * @param {Record<string, string>} [options.aliases] module aliases
 */
export default async function server({ cwd, overlayDir, middleware, http2 = false, compress = true, aliases } = {}) {
	/** @type {CustomServer} */
	const app = polka({
		onError(err, req, res) {
			// ignore missing favicon requests
			if (req.path == '/favicon.ico') return res.end();

			// @ts-ignore
			const code = typeof err.code === 'number' ? err.code : 500;
			res.writeHead(code, { 'content-type': 'text/plain' });
			res.end(err + '');
			console.error(err);
		}
	});

	if (http2) {
		try {
			const { createHttp2Server } = await import('./lib/http2.js');
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

	app.ws = new WebSocketServer(app.server, '/_hmr');

	if (compress) {
		// @TODO: reconsider now that npm deps are compressed AOT
		const threshold = compress === true ? 1024 : compress;
		app.use(compression({ threshold, level: 4 }));
	}

	app.use('/@npm', npmMiddleware({ aliases }));

	if (middleware) {
		app.use(...middleware);
	}

	if (overlayDir) {
		app.use(sirv(resolve(cwd || '', overlayDir), { dev: true }));
	}

	// SPA nav fallback
	app.use(
		sirv(cwd || '', {
			ignores: ['@npm'],
			single: true,
			dev: true
		})
	);

	// stub empty favicon
	app.get('/favicon.ico', (req, res) => {
		res.end('');
	});

	return app;
}
