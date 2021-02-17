import { createSecureServer } from 'http2';
import devcert from 'devcert';

export async function createHttp2Server(options = {}) {
	const host = process.env.HOST || 'localhost';
	const { key, cert } = await devcert.certificateFor(host);

	const server = createSecureServer({
		key,
		cert,
		allowHTTP1: true,
		...options
	});

	return server;
}
