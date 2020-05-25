import { promises as fs } from 'fs';
import net from 'net';
import server from './server.js';
import bundler from './bundler.js';

/**
 * Check if the requested port is free and increase port number
 * sequentially until we find a free port.
 * @param {number} port The suggested port to listen on
 * @returns {Promise<number>} The next free port
 */
async function getFreePort(port) {
	let found = false;
	let attempts = 0;

	// Limit to 20 attempts for now
	while (!found && attempts <= 20) {
		try {
			await new Promise((resolve, reject) => {
				const server = net.createServer();
				server.unref();
				server.on('error', reject);
				server.listen({ port }, () => {
					port = server.address().port;
					found = true;
					server.close(resolve);
				});
			});
		} catch (err) {
			if (err.code !== 'EADDRINUSE') throw err;
			port++;
			attempts++;
		}
	}

	return port;
}

/**
 * @typedef OtherOptions
 * @property {string} [host]
 * @property {string} [port]
 */

/**
 * @param {Parameters<server>[0] & Parameters<bundler>[0] & OtherOptions} options
 */
export async function start(options = {}) {
	if (!options.cwd) {
		if ((await fs.stat('public')).isDirectory()) {
			options.cwd = 'public';
		}
	}

	// export function start({ cwd, out, compress } = {}) {
	// const app = server({ cwd, out, compress });
	const app = server(options);

	bundler({
		...options,
		onError(err) {
			if (err.clientMessage && app.ws.clients.size > 0) {
				app.ws.broadcast({
					type: 'error',
					error: err.clientMessage
				});
			} else {
				console.error(err + '');
			}
		},
		onBuild({ changes, duration }) {
			app.ws.broadcast({
				type: 'update',
				dur: duration,
				changes
			});
		}
	});

	const port = await getFreePort(options.port || process.env.PORT || 8080);
	app.listen(port, options.host || process.env.HOST);
	let addr = app.server.address();
	if (typeof addr !== 'string') addr = `http://${addr.address.replace('::', 'localhost')}:${addr.port}`;
	console.log(`Listening on ${addr}`);
}
