import { promises as fs } from 'fs';
import server from './server.js';
import bundler from './bundler.js';

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

	app.listen(options.port || process.env.PORT || 8080, options.host || process.env.HOST);
	let addr = app.server.address();
	if (typeof addr !== 'string') addr = `http://${addr.address.replace('::', 'localhost')}:${addr.port}`;
	console.log(`Listening on ${addr}`);
}
