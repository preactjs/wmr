import { relative, resolve, join, dirname } from 'path';
import fs from 'fs';
import htmlparser2 from 'htmlparser2';
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

/**
 * @typedef {Object} BuildOptions
 * @property {string} [cwd = '']
 * @property {string} [publicDir = '']
 * @property {string} [out = '.dist']
 * @property {boolean} [sourcemap]
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

/** @param {BuildOptions} options */
export function bundleDev({ cwd, out, sourcemap, onError, onBuild, profile }) {
	cwd = cwd || '';
	const changedFiles = new Set();
	const input = './' + relative('.', join(cwd, 'index.js'));

	const watcher = rollup.watch({
		input, //'./' + join(cwd, 'index.js'),
		output: {
			sourcemap,
			sourcemapPathTransform: p => 'source://' + resolve(cwd, p).replace(/^(.\/)?/g, '/'),
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
			sucrasePlugin({
				typescript: true,
				sourcemap,
				production: false
			}),
			dynamicImportNamesPlugin({
				// suffix: '~' // avoid collisions with entry modules
			}),
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

const isLocalFile = src => !src.startsWith('http');

/** @param {BuildOptions & { npmChunks?: boolean }} options */
export async function bundleProd({ cwd, out, sourcemap, profile, npmChunks = false }) {
	cwd = cwd || '';

	const htmlFile = fs.readFileSync('./' + relative('.', join(cwd, 'index.html'))).toString();
	const scripts = [];
	const styles = [];
	const parser = new htmlparser2.Parser({
		onopentag(name, attribs) {
			switch (name) {
				case 'script': {
					if (attribs.type === 'module' && isLocalFile(attribs.src)) {
						scripts.push('./' + relative('.', join(cwd, attribs.src)));
					}
					break;
				}
				case 'link': {
					if (attribs.rel === 'stylesheet' && isLocalFile(attribs.href)) {
						styles.push('./' + relative('.', join(cwd, attribs.href)));
					}
					break;
				}
				default:
					return;
			}
		}
	});

	parser.write(htmlFile);
	parser.end();

	// TODO: produce multiple bundles with the contents of scripts and styles array
	const bundle = await rollup.rollup({
		input: [...scripts, ...styles],
		perf: !!profile,
		preserveEntrySignatures: 'allow-extension',
		manualChunks: npmChunks ? extractNpmChunks : undefined,
		plugins: [
			sucrasePlugin({
				typescript: true,
				sourcemap,
				production: true
			}),
			publicPathPlugin({ publicPath: '/' }),
			htmPlugin(),
			wmrStylesPlugin({ hot: false }),
			wmrPlugin({ hot: false }),
			json(),
			npmPlugin({ external: false })
		]
	});

	return await bundle.write({
		entryFileNames: '[name].[hash].js',
		chunkFileNames: 'chunks/[name].[hash].js',
		assetFileNames: 'assets/[name].[hash][extname]',
		compact: true,
		plugins: [terser({ compress: false, sourcemap })],
		sourcemap,
		sourcemapPathTransform: p => 'source://' + resolve(cwd, p).replace(/^(.\/)?/g, '/'),
		preferConst: true,
		dir: out || 'dist'
	});
}

/** @type {import('rollup').GetManualChunk} */
function extractNpmChunks(id, { getModuleIds, getModuleInfo }) {
	const chunk = getModuleInfo(id);
	if (/^\0npm\//.test(chunk.id)) {
		// merge any modules that are only used by other modules:
		const isInternalModule = chunk.importers.every(c => /^\0npm\//.test(c));
		if (isInternalModule) return null;

		// create dedicated chunks for npm dependencies that are used in more than one place:
		const importerCount = chunk.importers.length + chunk.dynamicImporters.length;
		if (importerCount > 1) {
			let name = chunk.id;
			// strip any unnecessary (non-unique) trailing path segments:
			const moduleIds = Array.from(getModuleIds()).filter(m => m !== name);
			while (name.length > 1) {
				const dir = dirname(name);
				const match = moduleIds.find(m => m.startsWith(dir));
				if (match) break;
				name = dir;
			}
			// /chunks/@npm/NAME.[hash].js
			return name.replace(/^\0npm\/((?:@[^/]+\/)?[^/]+)@[^/]+/, '@npm/$1');
		}
	}

	/*
	// This essentially duplicates what Rollup does by default:
	let fileName = relative(cwd, chunk.id);
	if (chunk.isEntry) {
		console.log('entry: ', chunk.id, fileName);
		return fileName;
	} else if (chunk.dynamicImporters.length && !chunk.importers.length) {
		console.log(
			'dynamic import: ',
			chunk.id,
			`lazy~${fileName.replace(/(^(\.?\/)?|(\/index)?\.[a-zA-Z]+$)/g, '').replace(/\//g, '--')}`
		);
		console.log(chunk);
		return `\0lazy~${fileName.replace(/(^(\.?\/)?|(\/index)?\.[a-zA-Z]+$)/g, '').replace(/\//g, '--')}`;
	} else if (/^\0npm\//.test(chunk.id) && !chunk.importers.every(c => /^\0npm\//.test(c))) {
		// Each outwardly-used npm module gets its own chunk
		return chunk.id;
	}
	*/
	return null;
}
