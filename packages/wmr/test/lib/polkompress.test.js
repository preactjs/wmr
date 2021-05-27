import { createServer } from 'http';
import compression from '../../src/lib/polkompress.js';
import { get } from '../test-helpers.js';

/**
 * @param {string} address
 * @param {string} [pathname]
 */
function send(address, pathname = '/') {
	let ctx = /** @type {*} */ ({ address });
	return get(ctx, pathname);
}

function setup(handler) {
	let mware = compression({ level: 1, threshold: 4 });
	let server = createServer((req, res) => {
		req.headers['accept-encoding'] = 'gzip';
		res.setHeader('content-type', 'text/plain');
		mware(req, res, () => handler(req, res));
	});
	return {
		listen() {
			return new Promise(res => {
				server.listen(() => {
					let info = server.address();
					let port = /** @type {import('net').AddressInfo} */ (info).port;
					return res(`http://localhost:${port}`);
				});
			});
		},
		close() {
			server.close();
		}
	};
}

describe('polkompress', () => {
	it('should be a function', () => {
		expect(typeof compression).toBe('function');
	});

	it('should return a function', () => {
		expect(typeof compression()).toBe('function');
	});

	it('should allow server to work if not compressing', async () => {
		const server = setup((r, res) => {
			res.end('OK');
		});

		try {
			const address = await server.listen();
			const output = await send(address);
			expect(output.status).toBe(200);
			expect(output.body).toBe('OK');

			const headers = output.res.headers;
			expect(headers['content-type']).toBe('text/plain');
			expect(headers['content-encoding']).toBe(undefined);
			expect(headers['transfer-encoding']).toBe('chunked');
			expect(headers['content-length']).toBe(undefined);
		} finally {
			server.close();
		}
	});

	it('should compress body when over threshold', async () => {
		const server = setup((r, res) => {
			res.end('HELLO WORLD');
		});

		try {
			const address = await server.listen();
			const output = await send(address);
			expect(output.status).toBe(200);
			expect(output.body).not.toBe('HELLO WORLD');

			const headers = output.res.headers;
			expect(headers['content-type']).toBe('text/plain');
			expect(headers['content-encoding']).toBe('gzip');
			expect(headers['transfer-encoding']).toBe('chunked');
			expect(headers['content-length']).toBe(undefined);
		} finally {
			server.close();
		}
	});

	it('should respect custom `statusCode` when set :: enabled', async () => {
		const server = setup((r, res) => {
			res.statusCode = 201;
			res.end('HELLO WORLD');
		});

		try {
			const address = await server.listen();
			const output = await send(address);
			expect(output.status).toBe(201);
			expect(output.body).not.toBe('HELLO WORLD');

			const headers = output.res.headers;
			expect(headers['content-encoding']).toBe('gzip');
			expect(headers['transfer-encoding']).toBe('chunked');
		} finally {
			server.close();
		}
	});

	it('should respect custom `statusCode` when set :: disabled', async () => {
		const server = setup((r, res) => {
			res.statusCode = 201;
			res.end('OK');
		});

		try {
			const address = await server.listen();
			const output = await send(address);
			expect(output.status).toBe(201);
			expect(output.body).toBe('OK');

			const headers = output.res.headers;
			expect(headers['content-encoding']).toBe(undefined);
			expect(headers['transfer-encoding']).toBe('chunked');
		} finally {
			server.close();
		}
	});
});
