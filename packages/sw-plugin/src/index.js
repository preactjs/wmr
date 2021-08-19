import path from 'path';
import { request } from 'http';

const pathToPosix = p => p.split(path.sep).join(path.posix.sep);

/**
 * Service Worker plugin for WMR.
 * @param {import('wmr').Options} options
 */
export default function swPlugin(options) {
	// In development, inject a middleware just to obtain the local address of WMR's HTTP server:
	let loopback;
	if (!options.prod) {
		options.middleware.push((req, res, next) => {
			if (!loopback) loopback = req.connection.address();
			next();
		});
	}

	const wmrProxyPlugin = {
		name: 'sw-wmr-proxy-plugin',
		resolveId(id) {
			const normalizedId = id[1] + id[2] === ':\\' ? pathToPosix(id.slice(2)) : id;
			if (id.startsWith('/@npm/')) return id;
			if (!/^\.*\//.test(normalizedId)) return '/@npm/' + id;
		},
		load(id) {
			if (id.startsWith('/@npm/'))
				return new Promise((y, n) => {
					request({ ...loopback, path: id }, res => {
						let data = '';
						res.setEncoding('utf-8');

						res.on('data', c => {
							data += c;
						});

						res.on('end', () => {
							y(data);
						});
					})
						.on('error', n)
						.end();
				});
		}
	};

	options.plugins.push({
		name: 'sw',
		async resolveId(id, importer) {
			if (!id.startsWith('sw:')) return;
			const resolved = await this.resolve(id.slice(3), importer);
			if (resolved) return `\0sw:${pathToPosix(resolved.id)}`;
		},
		async load(id) {
			if (!id.startsWith('\0sw:')) return;

			// In production, we just emit a chunk:
			if (options.prod) {
				const fileId = this.emitFile({
					type: 'chunk',
					id: id.slice(4),
					fileName: 'sw.js'
				});

				return `export default import.meta.ROLLUP_FILE_URL_${fileId}`;
			}

			// In development, we bundle to IIFE via Rollup, but use WMR's HTTP server to transpile dependencies:
			id = path.resolve(options.root, id.slice(4));

			try {
				var { rollup } = await import('rollup'); // eslint-disable-line no-var
			} catch {
				const error = 'Error: Service Worker compilation requires that you install Rollup:\n  npm i --save-dev rollup';
				console.error(error);
				return `export default null; throw ${JSON.stringify(error)};`;
			}

			const bundle = await rollup({
				input: id,
				plugins: [wmrProxyPlugin]
			});

			const { output } = await bundle.generate({ format: 'iife', compact: true });

			const fileId = this.emitFile({
				type: 'asset',
				name: '_' + id,
				fileName: '_sw.js?asset',  // hack: ensure the dev middleware responds with the raw asset
				source: output[0].code
			});

			return `export default import.meta.ROLLUP_FILE_URL_${fileId}`;
		}
	});
}
