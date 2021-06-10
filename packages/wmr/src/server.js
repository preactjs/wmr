import { resolve, relative, join } from 'path';
import { promises as fs } from 'fs';
import { createServer } from 'http';
import { createHttp2Server } from './lib/http2.js';
import polka from 'polka';
import sirv from 'sirv';
import compression from './lib/polkompress.js';
import npmMiddleware from './lib/npm-middleware.js';
import WebSocketServer from './lib/websocket-server.js';
import * as kl from 'kolorist';
import * as errorstacks from 'errorstacks';
import { hasDebugFlag } from './lib/output-utils.js';

/**
 * @typedef CustomServer
 * @type {polka.Polka & { server?: ReturnType<createServer> | import('http2').Http2Server, ws?: WebSocketServer, http2?: boolean } }
 */

/**
 * @param {object} options
 * @param {string} [options.cwd = ''] Directory to serve
 * @param {string} [options.root] Virtual process.cwd
 * @param {string} [options.publicDir] A directory containing public files, relative to cwd
 * @param {string} [options.overlayDir] A directory of generated files to serve if present, relative to cwd
 * @param {polka.Middleware[]} [options.middleware] Additional Polka middlewares to inject
 * @param {boolean} [options.http2 = false] Use HTTP/2
 * @param {boolean|number} [options.compress = true] Compress responses? Pass a `number` to set the size threshold.
 * @param {boolean} [options.optimize = true] Enable lazy dependency compression and optimization
 * @param {Record<string, string>} [options.alias] module or path alias mappings
 */
export default async function server({ cwd, root, overlayDir, middleware, http2, compress = true, optimize, alias }) {
	try {
		await fs.access(resolve(root, 'index.html'));
	} catch (e) {
		process.stderr.write(kl.yellow(`Warning: missing "index.html" file ${kl.dim(`(in ${root})`)}`) + '\n');
	}

	/** @type {CustomServer} */
	const app = polka({
		onError(err, req, res) {
			const fullPath = req.originalUrl.replace(/\?.+$/, '');

			// ignore missing favicon requests
			if (fullPath == '/favicon.ico') {
				res.writeHead(200, { 'content-type': 'image/x-icon', 'content-length': '0' });
				return res.end('');
			}

			// @ts-ignore
			const code = typeof err.code === 'number' ? err.code : 500;

			let msg = '';
			if (err) {
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
			const serverMessage = hasDebugFlag() && err.stack ? err.stack : msg;
			res.end(serverMessage);

			// We can log the fully detailed error to the CLI
			const displayPath = fullPath.startsWith('/@')
				? fullPath
				: './' + join(relative(cwd, root), fullPath.replace(/^\//, ''));

			const codeFrame = err.codeFrame ? `\n${err.codeFrame}` : '';
			const prettyStack = errorstacks
				.parseStackTrace(err.stack)
				.map(frame => {
					return kl.dim(`  at ${frame.name} (`) + kl.cyan(frame.fileName) + kl.dim(`:${frame.line}:${frame.column})`);
				})
				.join('\n');

			const stack = prettyStack ? `\n${prettyStack}` : '';
			console.error(`\n${kl.yellow(code)} ${kl.bold(displayPath)} - ${msg}\n${codeFrame}${stack}`);
		}
	});

	if (http2) {
		try {
			app.server = await createHttp2Server();
			app.http2 = true;
		} catch (e) {
			console.error(`Unable to create HTTP2 server, falling back to HTTP1:\n${e}`);
		}
	}
	if (!app.server) {
		app.server = createServer();
		app.server.keepAliveTimeout = 60 * 1000;
		app.http2 = false;
	}

	app.ws = new WebSocketServer(app.server, '/_hmr');

	if (compress) {
		// @TODO: reconsider now that npm deps are compressed AOT
		const threshold = compress === true ? 1024 : compress;
		app.use(compression({ threshold, level: 4 }));
	}

	app.use('/@npm', npmMiddleware({ alias, optimize, cwd }));

	if (middleware) {
		app.use(...middleware);
	}

	if (overlayDir) {
		app.use(sirv(resolve(root || '', overlayDir), { dev: true }));
	}

	// SPA nav fallback
	app.use(
		sirv(root || '', {
			ignores: ['@npm'],
			single: true,
			etag: true,
			dev: true
		})
	);

	return app;
}
