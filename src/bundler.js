import { relative, resolve, join, normalize } from 'path';
import * as rollup from 'rollup';
import { terser } from 'rollup-plugin-terser';
// import commonJs from '@rollup/plugin-commonjs';
import json from '@rollup/plugin-json';
import watcherPlugin from './plugins/watcher-plugin.js';
// import unpkgPlugin from './plugins/unpkg-plugin.js';
import htmPlugin from './plugins/htm-plugin.js';
import wmrPlugin from './plugins/wmr/plugin.js';
import wmrStylesPlugin from './plugins/wmr/styles-plugin.js';
// import processGlobalPlugin from './plugins/process-global-plugin.js';
import localNpmPlugin from './plugins/local-npm-plugin.js';

/** @typedef BuildEvent @type {{ changes: string[] } & Extract<rollup.RollupWatcherEvent, { code: 'BUNDLE_END' }> }} */
/** @typedef BuildError @type {rollup.RollupError & { clientMessage?: string }} */

function dev({ cwd, out, sourcemap, onError, onBuild, profile }) {
	const changedFiles = new Set();

	const watcher = rollup.watch({
		input: './' + join(cwd, 'index.js'),
		output: {
			sourcemap,
			sourcemapPathTransform: p => 'source://' + resolve('.', p).replace(/\/public\//g, '/'),
			preferConst: true,
			dir: out || '.dist',
			assetFileNames: '[name].[ext]',
			entryFileNames: '[name].js',
			chunkFileNames: '[name].js'
		},
		perf: !!profile,
		treeshake: false,
		manualChunks(filename) {
			// Internal modules get an underscore prefix:
			if (filename[0] === '\0') {
				filename = '_' + filename.substring(1);
				// return '_' + stripExt(filename.substring(1));
			} else {
				filename = relative(cwd, filename);
			}
			// Source modules get normalized file extensions
			// return stripExt(relative(cwd, filename).replace(/^[\\/]/gi, ''));

			return filename.replace(/(^[\\/]|\.([cm]js|[tj]sx?)$)/gi, '');
		},
		plugins: [
			watcherPlugin({
				cwd,
				watchedFiles: '**/*.!({js,cjs,mjs,ts,tsx})',
				onChange(filename) {
					changedFiles.add(filename);
				}
			}),
			wmrStylesPlugin({ hot: true, cwd }),
			wmrPlugin(),
			htmPlugin(),
			// processGlobalPlugin(),
			// commonJs({
			// 	ignoreGlobal: true,
			// 	sourceMap: sourcemap,
			// 	transformMixedEsModules: false,
			// 	include: /^\0npm/
			// }),
			// unpkgPlugin()
			json(),
			localNpmPlugin()
		].filter(Boolean)
	});

	/** @param {BuildError} error */
	function handleError(error) {
		let { code, plugin, message } = error;

		let preamble = 'Error';
		if (code === 'PLUGIN_ERROR') preamble += `(${plugin}): `;
		else if (code) preamble += `(${code.replace('_ERROR', '')}): `;

		let err = `${preamble}${message}`;

		error.message = err;

		// normalize source paths for use on the client
		error.clientMessage = err.replace(/ \(([^(]+):(\d+):(\d+)\)/, (s, file, line, col) => {
			let relativePath = '/' + relative(cwd, file);
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
				if (profile) {
					console.info(
						Object.entries(event.result.getTimings()).reduce((s, [k, v]) => {
							return `${s}\n${k.replace(/^(#*)/g, s => ' '.repeat((s.length || 3) * 2 - 2))}: ${v[0] | 0}ms`;
						}, '')
					);
				}
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

function prod({ cwd, out, sourcemap, profile }) {
	return rollup
		.rollup({
			input: './' + join(cwd, 'index.js'),
			perf: !!profile,
			treeshake: true,
			manualChunks(filename) {
				// Internal modules get an underscore prefix:
				if (filename[0] === '\0') {
					filename = '_' + filename.substring(1);
					// return '_' + stripExt(filename.substring(1));
				} else {
					filename = relative(cwd, filename);
				}
				// Source modules get normalized file extensions
				// return stripExt(relative(cwd, filename).replace(/^[\\/]/gi, ''));

				return filename.replace(/(^[\\/]|\.([cm]js|[tj]sx?)$)/gi, '');
			},
			plugins: [
				wmrStylesPlugin({ hot: false }),
				htmPlugin(),
				json(),
				localNpmPlugin(),
				terser({
					ecma: 8,
					safari10: true
				})
			]
		})
		.then(bundle => {
			console.log('succcessfully built bundle.');
			return bundle.write({
				sourcemap,
				sourcemapPathTransform: p => 'source://' + resolve('.', p).replace(/\/public\//g, '/'),
				preferConst: true,
				dir: out || '.dist',
				assetFileNames: '[name].[ext]',
				entryFileNames: '[name].js',
				chunkFileNames: '[name].js'
			});
		});
}

/**
 * Start a watching bundler
 * @param {object} options
 * @param {string} [options.cwd = '']
 * @param {string} [options.out = '.dist']
 * @param {boolean} [options.sourcemap]
 * @param {boolean} [options.profile] Enable bundler performance profiling
 * @param {(error: BuildError)=>void} [options.onError]
 * @param {(error: BuildEvent)=>void} [options.onBuild]
 */
export default function bundler({ cwd = '', out, sourcemap = false, onError, onBuild, profile = false }, devMode) {
	cwd = normalize(cwd);
	if (devMode) {
		return dev({ cwd, out, sourcemap, onError, onBuild, profile });
	}
	return prod({ cwd, out, sourcemap, profile });
}
