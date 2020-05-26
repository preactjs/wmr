import { promises as fs } from 'fs';
import server from './server.js';
import bundler from './bundler.js';
import { getFreePort, getServerAddresses } from './lib/net-utils.js';

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
				const message = /^Error/.test(err.message) ? err.message : err + '';
				console.error(message);
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
	console.log(getServerAddresses(app.server.address()));
}
