import sirv from 'sirv';
import polka from 'polka';
import { Readable, Writable } from 'stream';
import { createServer, IncomingMessage } from 'http';
import { createSecureServer } from 'http2';
import compression from './lib/polkompress.js';
import npmMiddleware from './lib/npm-middleware.js';
import WebSocketServer from './lib/websocket-server.js';

function createHttp2Server(options) {
	const server = createSecureServer({}, (request, response) => {});

	class IncomingMessage extends Readable {
		constructor(opts) {
			super();
			this.method = opts.method;
			this.url = opts.url;
			this.path = opts.path;
			this.complete = false;
			this.headers = opts.headers || {};
			this.rawHeaders = opts.rawHeaders;
			this.httpVersion = '1.1'; // lol
			this.socket = opts.socket;
		}
		setTimeout() {}
	}

	/*
	const STREAM = Symbol.for('h2stream');
	class ServerResponse extends Writable {
		constructor(stream) {
			super();
			this[STREAM] = stream;
			this.headersWritten = false;
		}
		writeHead(status, headers, callback) {
			if (this.headersWritten) throw Error('Header already written');
			this.headersWritten = true;
			const head = { ':status': status || 200 };
			if (headers) Object.assign(head, headers);
			this[STREAM].respond(head);
		}
		write(chunk, encoding, callback) {
			this[STREAM].write(chunk, encoding, callback);
		}
	}
	*/
	function writeHead(status, headers, callback) {
		const head = { ':status': status || 200 };
		if (headers) Object.assign(head, headers);
		this.respond(head);
	}

	server.on('stream', (stream, headers, flags, rawHeaders) => {
		// const req = new IncomingMessage(stream.session.socket);
		const path = headers[':path'] || '';
		const url = `${headers[':scheme'] || ''}//${headers.host || ''}${path}`;
		const h1Headers = {};
		for (let i in headers) {
			const key = i[0] === ':' ? i.substring(1) : i;
			h1Headers[key] = headers[i];
		}
		const h1RawHeaders = rawHeaders.map((h, i) => (h[0] === ':' && i % 2 === 0 ? h.substring(1) : h));
		const req = new IncomingMessage({
			method: headers[':method'],
			url,
			path,
			headers: h1Headers,
			rawHeaders: h1RawHeaders,
			socket: stream.session.socket
		});
		stream.writeHead = writeHead;
		server.emit('request', req, stream);
	});

	return server;
}

/**
 * @typedef CustomServer
 * @type {polka.Polka & { server?: ReturnType<createServer>, ws?: WebSocketServer } }
 */

/**
 * @param {object} [options]
 * @param {string} [options.cwd = ''] Directory to serve
 * @param {string} [options.overlayDir] A directory of generated files to serve if present
 * @param {polka.Middleware[]} [options.middleware] Additional Polka middlewares to inject
 * @param {boolean|number} [options.http2 = false] Use HTTP/2
 * @param {boolean|number} [options.compress = true] Compress responses? Pass a `number` to set the size threshold.
 */
export default function server({ cwd, overlayDir, middleware, http2 = false, compress = true } = {}) {
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
		app.server = createSecureServer();
	} else {
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
