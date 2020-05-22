import server from './server.js';
import bundler from './bundler.js';

/**
 * @param {Parameters<server>[0] & Parameters<bundler>[0]} options
 * @aparam {object} options
 * @aparam {string} [options.cwd]
 * @aparam {string} [options.out]
 * @aparam {boolean|number} [options.compress]
 */
export function start(options = {}) {
	// export function start({ cwd, out, compress } = {}) {
	// const app = server({ cwd, out, compress });
	const app = server(options);

	bundler({
		...options,
		onError(err) {
			app.ws.broadcast({
				type: 'error',
				error: err.clientMessage
			});
		},
		onBuild({ changes, duration }) {
			app.ws.broadcast({
				type: 'update',
				dur: duration,
				changes
			});
		}
	});

	app.listen(process.env.PORT);
}
