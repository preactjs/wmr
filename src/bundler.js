import { relative, resolve, join, normalize } from 'path';
import * as rollup from 'rollup';
import watcherPlugin from './plugins/watcher-plugin.js';
import unpkgPlugin from './plugins/unpkg-plugin.js';
import htmPlugin from './plugins/htm-plugin.js';
import wmrPlugin from './plugins/wmr/plugin.js';
import wmrStylesPlugin from './plugins/wmr/styles-plugin.js';

/** @typedef BuildEvent @type {{ changes: string[] } & Extract<rollup.RollupWatcherEvent, { code: 'BUNDLE_END' }> }} */
/** @typedef BuildError @type {rollup.RollupError & { clientMessage?: string }} */

/**
 * Start a watching bundler
 * @param {object} options
 * @param {string} [options.cwd]
 * @param {boolean} [options.sourcemap]
 * @param {(error: BuildError)=>void} [options.onError]
 * @param {(error: BuildEvent)=>void} [options.onBuild]
 */
export default function bundler({ cwd = '', sourcemap = false, onError, onBuild }) {
	cwd = normalize(cwd);

	const changedFiles = new Set();

	const watcher = rollup.watch({
		input: './' + join(cwd, 'index.js'),
		output: {
			sourcemap,
			sourcemapPathTransform: p => 'source://' + resolve('.', p).replace(/\/public\//g, '/'),
			preferConst: true,
			dir: '.dist'
		},
		treeshake: false,
		preserveModules: true,
		plugins: [
			watcherPlugin({
				cwd,
				watchedFiles: '**/*.!({js,cjs,mjs,ts,tsx})',
				onChange(filename) {
					changedFiles.add(filename);
				}
			}),
			wmrStylesPlugin(),
			wmrPlugin(),
			htmPlugin(),
			unpkgPlugin()
		]
	});

	/** @param {BuildError} error */
	function handleError(error) {
		let { code, plugin, message } = error;

		let preamble = `Error(${code.replace('_ERROR', '')}): `;
		if (code === 'PLUGIN_ERROR') preamble = `Error(${plugin}): `;
		let err = `${preamble}${message}`;

		error.message = err;

		// normalize source paths for use on the client
		error.clientMessage = err.replace(/ \(([^(]+):(\d+):(\d+)\)/, (s, file, line, col) => {
			let relativePath = '/' + relative('public', file);
			// if sourcemaps are enabled, link to them in the client error:
			if (sourcemap) relativePath = 'source://' + relativePath;
			return ` (${relativePath}:${line}:${col})`;
		});

		if (onError) onError(error);
	}

	let builtChanges = [];
	watcher.on('event', event => {
		switch (event.code) {
			case 'ERROR':
				handleError(event.error);
				break;

			case 'START':
				builtChanges = [...changedFiles];
				changedFiles.clear();
				break;

			case 'BUNDLE_END':
				console.info(`Bundled in ${event.duration}ms`);
				if (onBuild)
					onBuild({
						changes: builtChanges,
						...event
					});
				break;
		}
	});

	return watcher;
}
