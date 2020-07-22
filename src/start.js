import server from './server.js';
import wmrMiddleware from './wmr-middleware.js';
import { getFreePort, getServerAddresses } from './lib/net-utils.js';
import { normalizeOptions } from './lib/normalize-options.js';
import { setCwd } from './plugins/npm-plugin/registry.js';

/**
 * @typedef OtherOptions
 * @property {boolean} [prebuild = false]
 * @property {string} [host]
 * @property {string} [port]
 */

/**
 * @param {Parameters<server>[0] & Parameters<import('./bundler')['bundleDev']>[0] & OtherOptions} options
 */
export default async function start(options = {}) {
	// @todo remove this hack once registry.js is instantiable
	setCwd(options.cwd);

	options = await normalizeOptions(options);

	if (options.prebuild) {
		const { bundleDev } = await import('./bundler.js');
		bundleDev({
			...options,
			onError: sendError,
			onBuild: sendChanges
		});
	} else {
		options.middleware = [
			wmrMiddleware({
				...options,
				onError: sendError,
				onChange: sendChanges
			})
		];
	}

	function sendError(err) {
		if (app.ws.clients.size > 0) {
			app.ws.broadcast({
				type: 'error',
				error: err.clientMessage || err.message
			});
		} else {
			const message = /^Error/.test(err.message) ? err.message : err + '';
			console.error(message);
		}
	}

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
	console.log(getServerAddresses(app.server.address(), { https: app.http2 }));
}
