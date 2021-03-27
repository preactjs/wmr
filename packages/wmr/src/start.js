import chokidar from 'chokidar';
import * as kl from 'kolorist';
import server from './server.js';
import wmrMiddleware from './wmr-middleware.js';
import { getServerAddresses } from './lib/net-utils.js';
import { normalizeOptions } from './lib/normalize-options.js';
import { setCwd } from './plugins/npm-plugin/registry.js';
import { formatBootMessage } from './lib/output-utils.js';

/**
 * @typedef OtherOptions
 * @property {string} [host]
 * @property {number} [port]
 * @property {Record<string, string>} [env]
 */

/**
 * @type {<T>(obj: T) => T}]
 */
const deepCloneJSON = obj => JSON.parse(JSON.stringify(obj));

/**
 * @param {Parameters<server>[0] & OtherOptions} options
 */
export default async function start(options = {}) {
	// @todo remove this hack once registry.js is instantiable
	setCwd(options.cwd);

	// TODO: We seem to mutate our config object somewhere
	const cloned = deepCloneJSON(options);

	/** @type {string[]} */
	const configWatchFiles = [];

	// Reload server on config changes
	let instance = await bootServer(cloned, configWatchFiles);
	const watcher = chokidar.watch(configWatchFiles, {
		cwd: cloned.root,
		disableGlobbing: true
	});
	watcher.on('change', async () => {
		await instance.close();

		console.log(kl.yellow(`WMR: `) + kl.green(`config or .env file changed, restarting server...\n`));

		// Fire up new instance
		const cloned = deepCloneJSON(options);
		const configWatchFiles = [];
		instance = await bootServer(cloned, configWatchFiles);
		watcher.add(configWatchFiles);
	});
}

/**
 *
 * @param {Parameters<server>[0] & OtherOptions} options
 * @param {string[]} configWatchFiles
 * @returns {Promise<{ close: () => Promise<void>}>}
 */
async function bootServer(options, configWatchFiles) {
	options = await normalizeOptions(options, 'start', configWatchFiles);

	options.host = options.host || process.env.HOST;

	options.middleware = [].concat(
		// @ts-ignore-next
		options.middleware || [],

		wmrMiddleware({
			...options,
			onError: sendError,
			onChange: sendChanges
		})
	);

	// eslint-disable-next-line
	function sendError(err) {
		if (app.ws.clients.size > 0) {
			app.ws.broadcast({
				type: 'error',
				error: err.clientMessage || err.message,
				codeFrame: err.codeFrame
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
	function sendChanges({ changes, reload }) {
		if (options.reload || reload) {
			app.ws.broadcast({ type: 'reload' });
		} else {
			app.ws.broadcast({
				type: 'update',
				changes
			});
		}
	}

	const app = await server(options);
	app.listen(options.port, options.host, () => {
		const addresses = getServerAddresses(app.server.address(), { https: app.http2 });
		const message = `server running at:`;
		process.stdout.write(formatBootMessage(message, addresses));
	});

	return {
		close: () =>
			new Promise((resolve, reject) => {
				if (app.server) {
					app.server.close(err => (err ? reject(err) : resolve()));
				} else {
					resolve();
				}
			})
	};
}
