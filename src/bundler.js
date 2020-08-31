import { relative, sep, posix, resolve, dirname } from 'path';
import * as rollup from 'rollup';
import json from '@rollup/plugin-json';
import watcherPlugin from './plugins/watcher-plugin.js';
import htmPlugin from './plugins/htm-plugin.js';
import sucrasePlugin from './plugins/sucrase-plugin.js';
import wmrPlugin from './plugins/wmr/plugin.js';
import wmrStylesPlugin from './plugins/wmr/styles-plugin.js';
import localNpmPlugin from './plugins/local-npm-plugin.js';
import terser from './plugins/fast-minify.js';
import npmPlugin from './plugins/npm-plugin/index.js';
import publicPathPlugin from './plugins/public-path-plugin.js';
import dynamicImportNamesPlugin from './plugins/dynamic-import-names-plugin.js';
import minifyCssPlugin from './plugins/minify-css-plugin.js';
import htmlEntriesPlugin from './plugins/html-entries-plugin.js';
import glob from 'tiny-glob';
import aliasesPlugin from './plugins/aliases-plugin.js';
import processGlobalPlugin from './plugins/process-global-plugin.js';
import urlPlugin from './plugins/url-plugin.js';
import resolveExtensionsPlugin from './plugins/resolve-extensions-plugin.js';
import fastCjsPlugin from './plugins/fast-cjs-plugin.js';
import bundlePlugin from './plugins/bundle-plugin.js';

/** @param {string} p */
const pathToPosix = p => p.split(sep).join(posix.sep);

/**
 * @typedef {Object} BuildOptions
 * @property {string} [cwd = '']
 * @property {string} [publicDir = '']
 * @property {string} [out = '.cache']
 * @property {boolean} [sourcemap]
 * @property {Record<string, string>} [aliases] module aliases
 * @property {boolean} [profile] Enable bundler performance profiling
 * @property {(error: BuildError)=>void} [onError]
 * @property {(error: BuildEvent)=>void} [onBuild]
 */

/**
 * @typedef BuildEvent
 * @type {{ changes: string[] } & Extract<rollup.RollupWatcherEvent, { code: 'BUNDLE_END' }> }}
 */

/**
 * @typedef BuildError
 * @type {rollup.RollupError & { clientMessage?: string }}
 */

/**
 * @param {BuildOptions} options
 * @TODO Refactor to return a customized bundleProd() return value,
 *       to make bundled development mode more useful and reduce complexity.
 */
export async function bundleDev({ cwd, publicDir, out, sourcemap, aliases, onError, onBuild, profile }) {
	cwd = cwd || '';
	const changedFiles = new Set();

	const htmlFiles = await glob('**/*.html', {
		cwd,
		absolute: true,
		filesOnly: true
	});

	// note: we intentionally pass these to Rollup as posix paths
	const input = htmlFiles.filter(p => !p.startsWith(out)).map(p => './' + pathToPosix(relative('.', p)));

	if (input.length === 0) {
		throw Error(`Can't bundle: no HTML files found (in ${cwd})`);
	}

	const watcher = rollup.watch({
		input, //'./' + join(cwd, 'index.js'),
		output: {
			sourcemap,
			sourcemapPathTransform(p, mapPath) {
				let url = pathToPosix(relative(cwd, resolve(dirname(mapPath), p)));
				// strip leading relative path
				url = url.replace(/^\.\//g, '');
				// replace internal npm prefix
				url = url.replace(/^(\.?\.?\/)?[\b]npm\//, '@npm/');
				return 'source:///' + url;
			},
			preferConst: true,
			minifyInternalExports: false,
			dir: out,
			entryFileNames: '[name].js',
			chunkFileNames: '[name].js',
			assetFileNames: '[name][extname]'
		},
		perf: !!profile,
		treeshake: false,
		preserveEntrySignatures: 'allow-extension',
		manualChunks(filename) {
			// Internal modules get an underscore prefix:
			if (filename[0] === '\0' || filename[0] === '\b') {
				filename = '_' + filename.substring(1);
				// return '_' + stripExt(filename.substring(1));
			} else {
				filename = posix.relative(cwd, filename);
			}
			// Source modules get normalized file extensions
			// return stripExt(relative(cwd, filename).replace(/^[\\/]/gi, ''));

			return filename.replace(/(^[\\/]|\.([cm]js|[tj]sx?)$)/gi, '');
		},
		plugins: [
			htmlEntriesPlugin({ cwd, publicDir, publicPath: '/' }),
			sucrasePlugin({
				typescript: true,
				sourcemap,
				production: false
			}),
			dynamicImportNamesPlugin({
				// suffix: '~' // avoid collisions with entry modules
			}),
			aliasesPlugin({ aliases }),
			watcherPlugin({
				cwd,
				watchedFiles: '**/*.!({js,cjs,mjs,ts,tsx})',
				onChange(filename) {
					changedFiles.add(filename);
				}
			}),
			htmPlugin(),
			wmrStylesPlugin({ hot: true, cwd }),
			wmrPlugin(),
			processGlobalPlugin({
				NODE_ENV: 'development'
			}),
			resolveExtensionsPlugin({
				typescript: true,
				index: true
			}),
			fastCjsPlugin(),
			// unpkgPlugin()
			json(),
			localNpmPlugin(),
			urlPlugin(),
			bundlePlugin({ cwd })
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
			let relativePath = '/' + posix.relative(cwd, file);
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

/** @param {BuildOptions & { npmChunks?: boolean }} options */
export async function bundleProd({ cwd, publicDir, out, sourcemap, aliases, profile, npmChunks = false }) {
	cwd = cwd || '';

	const htmlFiles = await glob('**/*.html', {
		cwd,
		absolute: true,
		filesOnly: true
	});

	// note: we intentionally pass these to Rollup as posix paths
	const input = htmlFiles.filter(p => !p.startsWith(out)).map(p => './' + pathToPosix(relative('.', p)));

	const bundle = await rollup.rollup({
		input,
		perf: !!profile,
		preserveEntrySignatures: 'allow-extension',
		manualChunks: npmChunks ? extractNpmChunks : undefined,
		plugins: [
			sucrasePlugin({
				typescript: true,
				sourcemap,
				production: true
			}),
			htmlEntriesPlugin({ cwd, publicDir, publicPath: '/' }),
			publicPathPlugin({ publicPath: '/' }),
			aliasesPlugin({ aliases }),
			htmPlugin(),
			wmrStylesPlugin({ hot: false, cwd }),
			wmrPlugin({ hot: false }),
			processGlobalPlugin({
				NODE_ENV: 'production'
			}),
			resolveExtensionsPlugin({
				typescript: true,
				index: true
			}),
			fastCjsPlugin({
				// include: f => !/^[\b]npm\//.test(f)
			}),
			json(),
			npmPlugin({ external: false }),
			minifyCssPlugin({ sourcemap }),
			urlPlugin(),
			bundlePlugin({ cwd })
		]
	});

	return await bundle.write({
		entryFileNames: '[name].[hash].js',
		chunkFileNames: 'chunks/[name].[hash].js',
		assetFileNames: 'assets/[name].[hash][extname]',
		compact: true,
		plugins: [terser({ compress: true, sourcemap })],
		sourcemap,
		sourcemapPathTransform(p, mapPath) {
			let url = pathToPosix(relative(cwd, resolve(dirname(mapPath), p)));
			// strip leading relative path
			url = url.replace(/^\.\//g, '');
			// replace internal npm prefix
			url = url.replace(/^(\.?\.?\/)?[\b]npm\//, '@npm/');
			return 'source:///' + url;
		},
		preferConst: true,
		dir: out || 'dist'
	});
}

/** @type {import('rollup').GetManualChunk} */
function extractNpmChunks(id, { getModuleIds, getModuleInfo }) {
	const chunk = getModuleInfo(id);
	if (/^[\b]npm\//.test(chunk.id)) {
		// merge any modules that are only used by other modules:
		const isInternalModule = chunk.importers.every(c => /^[\b]npm\//.test(c));
		if (isInternalModule) return null;

		// create dedicated chunks for npm dependencies that are used in more than one place:
		const importerCount = chunk.importers.length + chunk.dynamicImporters.length;
		if (importerCount > 1) {
			let name = chunk.id;
			// strip any unnecessary (non-unique) trailing path segments:
			const moduleIds = Array.from(getModuleIds()).filter(m => m !== name);
			while (name.length > 1) {
				const dir = posix.dirname(name);
				const match = moduleIds.find(m => m.startsWith(dir));
				if (match) break;
				name = dir;
			}
			// /chunks/@npm/NAME.[hash].js
			return name.replace(/^[\b]npm\/((?:@[^/]+\/)?[^/]+)@[^/]+/, '@npm/$1');
		}
	}
	return null;
}
