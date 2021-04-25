import * as kl from 'kolorist';
import { promises as fs } from 'fs';
import { posix, resolve } from 'path';
import server from './server.js';
import wmrMiddleware from './wmr-middleware.js';
import { getServerAddresses, supportsSearchParams } from './lib/net-utils.js';
import { normalizeOptions } from './lib/normalize-options.js';
import { setCwd } from './plugins/npm-plugin/registry.js';
import { formatBootMessage, debug } from './lib/output-utils.js';
import { watch } from './lib/fs-watcher.js';
import { injectWmr } from './lib/transform-html.js';
import { parseStackTrace } from 'errorstacks';

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

	// Get the actual port we used and use that from here on
	// to prevent us from picking another port on restart.
	options.port = await instance.resolvePort;

	if (!supportsSearchParams) {
		console.log(kl.yellow(`WMR: Automatic config reloading is not supported on Node <= 12.18.4`));
	} else {
		const logWatcher = debug('wmr:watcher');
		const watcher = watch(configWatchFiles, {
			cwd: cloned.root,
			disableGlobbing: true
		});
		watcher.on('ready', () => logWatcher(' watching for config changes'));
		watcher.on('change', async () => {
			await instance.close();

			console.log(kl.yellow(`WMR: `) + kl.green(`config or .env file changed, restarting server...\n`));

			// Fire up new instance
			const cloned = deepCloneJSON(options);
			const configWatchFiles = [];
			instance = await bootServer(cloned, configWatchFiles);
			watcher.add(configWatchFiles);
			logWatcher('Server restarted');
		});
	}
}

/**
 *
 * @param {Parameters<server>[0] & OtherOptions} options
 * @param {string[]} configWatchFiles
 * @returns {Promise<{ close: () => Promise<void>, resolvePort: Promise<number>}>}
 */
async function bootServer(options, configWatchFiles) {
	options = await normalizeOptions(options, 'start', configWatchFiles);

	options.middleware = [].concat(
		// @ts-ignore-next
		options.middleware || [],

		wmrMiddleware({
			...options,
			onError: sendError,
			onChange: sendChanges
		}),
		injectWmrMiddleware(options)
	);

	// eslint-disable-next-line
	function sendError(err) {
		if (app.ws.clients.size > 0) {
			app.ws.broadcast({
				type: 'error',
				error: err.clientMessage || err.message,
				codeFrame: kl.stripColors(err.codeFrame),
				stack: parseStackTrace(err.stack)
			});
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

	let resolveActualPort;
	let actualPort = new Promise(r => (resolveActualPort = r));
	const closeServer = makeCloseable(app.server);
	app.listen(options.port, options.host, () => {
		const addresses = getServerAddresses(app.server.address(), {
			host: options.host,
			https: app.http2
		});

		const message = `server running at:`;
		process.stdout.write(formatBootMessage(message, addresses));

		// If the port was `0` than the OS picks a random
		// free port. Get the actual port here so that we
		// can reconnect to the same server from the client.
		const port = +app.server.address().port;
		resolveActualPort(port);
	});

	return {
		resolvePort: actualPort,
		async close() {
			app.ws.broadcast({
				type: 'info',
				message: 'Server restarting...',
				kind: 'restart'
			});
			app.ws.close();
			await closeServer();
		}
	};
}

const injectWmrMiddleware = ({ cwd }) => {
	return async (req, res, next) => {
		try {
			// If we haven't intercepted the request it's safe to assume we need to inject wmr.
			const path = posix.normalize(req.path);
			if (!/\.[a-z]+$/gi.test(path) && !path.startsWith('/@npm')) {
				const start = Date.now();
				const index = resolve(cwd, 'index.html');
				const html = await fs.readFile(index, 'utf-8');
				const result = await injectWmr(html);
				const time = Date.now() - start;
				res.writeHead(200, {
					'Content-Type': 'text/html;charset=utf-8',
					'Content-Length': Buffer.byteLength(result, 'utf-8'),
					'Server-Timing': `index.html;dur=${time}`
				});
				res.end(result);
			}
		} catch (e) {
			next();
		}
		next();
	};
};

/**
 * Close all open connections to a server. Adapted from
 * https://github.com/vitejs/vite/blob/352cd397d8c9d2849690e3af0e84b00c6016b987/packages/vite/src/node/server/index.ts#L628
 * @param {import("http").Server | import("http2").Http2SecureServer} server
 * @returns
 */
function makeCloseable(server) {
	/** @type {Set<import('net').Socket>} */
	const sockets = new Set();
	let listened = false;

	server.on('connection', s => {
		sockets.add(s);
		s.on('close', () => sockets.delete(s));
	});

	server.once('listening', () => (listened = true));

	return async () => {
		sockets.forEach(s => s.destroy());
		if (!listened) return;
		await new Promise((resolve, reject) => {
			server.close(err => (err ? reject(err) : resolve()));
		});
	};
}
