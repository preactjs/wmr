import { createServer } from 'http';
import { parse as parseUrl } from 'url';
import ws from 'ws';
import polka from 'polka';
import sirv from 'sirv';
import compression from './lib/polkompress.js';

/**
 * @typedef CustomServer
 * @type {import('polka').Polka & { server?: ReturnType<createServer>, ws?: ws.Server & { broadcast?(data: any) } }}
 */

/**
 * @param {object} [options]
 * @param {string} [options.cwd = ''] Directory to serve
 * @param {string} [options.out = '.dist'] Directory to store generated files
 * @param {boolean|number} [options.compress = true] Compress responses? Pass a `number` to set the size threshold.
 */
export default function server({ cwd, out, compress = true } = {}) {
	/** @type {CustomServer} */
	const app = polka();

	app.server = createServer();

	app.ws = new ws.Server({ noServer: true });

	app.ws.broadcast = data => {
		app.ws.clients.forEach(client => {
			if (client.readyState !== ws.OPEN) return;
			client.send(JSON.stringify(data));
		});
	};

	app.server.on('upgrade', (req, socket, head) => {
		const pathname = parseUrl(req.url).pathname;
		if (pathname == '/_hmr') {
			app.ws.handleUpgrade(req, socket, head, ws => {
				ws.emit('connection', ws, req);
			});
		} else {
			socket.destroy();
		}
	});

	if (compress) {
		// @TODO: consider moving to AOT+upgrade compression
		const threshold = compress === true ? 1024 : compress;
		app.use(compression({ threshold, level: 4 }));
	}

	app.use(sirv(out || '.dist', { dev: true }));

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
