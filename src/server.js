import sirv from 'sirv';
import polka from 'polka';
import { createServer } from 'http';
import compression from './lib/polkompress.js';
import npmMiddleware from './lib/npm-middleware.js';
import WebSocketServer from './lib/websocket-server.js';

/**
 * @typedef CustomServer
 * @type {polka.Polka & { server?: ReturnType<createServer>, ws?: WebSocketServer } }
 */

/**
 * @param {object} [options]
 * @param {string} [options.cwd = ''] Directory to serve
 * @param {string} [options.overlayDir] A directory of generated files to serve if present
 * @param {polka.Middleware[]} [options.middleware] Additional Polka middlewares to inject
 * @param {boolean|number} [options.compress = true] Compress responses? Pass a `number` to set the size threshold.
 */
export default function server({ cwd, overlayDir, middleware, compress = true } = {}) {
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

	app.server = createServer();

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

	const servePublic = sirv(cwd || '', { dev: true });
	app.use(servePublic);
	// SPA nav fallback
	app.use((req, res, next) => {
		if (!/text\/html/.test(req.headers.accept)) return next();
		// @ts-ignore
		req.path = '/';
		servePublic(req, res, next);
	});

	return app;
}
