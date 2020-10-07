import server from './server.js';
import wmrMiddleware from './wmr-middleware.js';
import { getFreePort, getServerAddresses } from './lib/net-utils.js';
import { normalizeOptions } from './lib/normalize-options.js';
import { setCwd } from './plugins/npm-plugin/registry.js';

/**
 * @typedef OtherOptions
 * @property {string} [host]
 * @property {string} [port]
 * @property {Record<string, string>} [env]
 */

/**
 * @param {Parameters<server>[0] & OtherOptions} options
 */
export default async function start(options = {}) {
	// @todo remove this hack once registry.js is instantiable
	setCwd(options.cwd);

	options = await normalizeOptions(options);

	options.middleware = [
		wmrMiddleware({
			...options,
			onError: sendError,
			onChange: sendChanges
		})
	];

	// eslint-disable-next-line
	function sendError(err) {
		if (app.ws.clients.size > 0) {
			app.ws.broadcast({
				type: 'error',
				error: err.clientMessage || err.message
			});
		} else if (((err.code / 200) | 0) === 2) {
			// skip 400-599 errors, they're net errors logged to console
		} else if (process.env.DEBUG) {
			console.error(err);
		} else {
			const message = err.formatted ? err.formatted : /^Error/.test(err.message) ? err.message : err + '';
			console.error(message);
		}
	}

	// eslint-disable-next-line
	function sendChanges({ changes }) {
		app.ws.broadcast({
			type: 'update',
			changes
		});
	}

	const app = await server(options);
	const port = await getFreePort(options.port || process.env.PORT || 8080);
	const host = options.host || process.env.HOST;
	app.listen(port, host);
	const addresses = getServerAddresses(app.server.address(), { https: app.http2 });
	process.stdout.write(`\u001b[36mListening on ${addresses}\u001b[0m\n`);
}
