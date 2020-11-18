import { relative, sep, posix, resolve, dirname } from 'path';
import * as rollup from 'rollup';
import htmPlugin from './plugins/htm-plugin.js';
import sucrasePlugin from './plugins/sucrase-plugin.js';
import wmrPlugin from './plugins/wmr/plugin.js';
import wmrStylesPlugin from './plugins/wmr/styles-plugin.js';
import sassPlugin from './plugins/sass-plugin.js';
import terser from './plugins/fast-minify.js';
import npmPlugin from './plugins/npm-plugin/index.js';
import publicPathPlugin from './plugins/public-path-plugin.js';
import minifyCssPlugin from './plugins/minify-css-plugin.js';
import htmlEntriesPlugin from './plugins/html-entries-plugin.js';
import glob from 'tiny-glob';
import aliasesPlugin from './plugins/aliases-plugin.js';
import processGlobalPlugin from './plugins/process-global-plugin.js';
import urlPlugin from './plugins/url-plugin.js';
import resolveExtensionsPlugin from './plugins/resolve-extensions-plugin.js';
import fastCjsPlugin from './plugins/fast-cjs-plugin.js';
import bundlePlugin from './plugins/bundle-plugin.js';
import jsonPlugin from './plugins/json-plugin.js';
import optimizeGraphPlugin from './plugins/optimize-graph-plugin.js';

/** @param {string} p */
const pathToPosix = p => p.split(sep).join(posix.sep);

/** @typedef {import('rollup').OutputOptions} OutputOptions */
/** @typedef {OutputOptions | ((opts: OutputOptions) => OutputOptions)} Output */

/**
 * @typedef {Object} BuildOptions
 * @property {string} [cwd = '']
 * @property {string} [root = ''] cwd without implicit ./public dir
 * @property {string} [publicDir = '']
 * @property {string} [out = '.cache']
 * @property {boolean} [sourcemap]
 * @property {Record<string, string>} [aliases] module aliases
 * @property {boolean} [profile] Enable bundler performance profiling
 * @property {Record<string, string>} [env]
 * @property {import('rollup').Plugin[]} [plugins]
 * @property {Output | Output[]} [output]
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

/** @param {BuildOptions & { npmChunks?: boolean }} options */
export async function bundleProd({
	cwd,
	root,
	publicDir,
	out,
	sourcemap,
	aliases,
	profile,
	env = {},
	plugins,
	output,
	npmChunks = false
}) {
	cwd = cwd || '';
	root = root || cwd;

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
			aliasesPlugin({ aliases, cwd: root }),
			htmPlugin(),
			sassPlugin({ production: true }),
			wmrStylesPlugin({ hot: false, cwd }),
			wmrPlugin({ hot: false }),
			processGlobalPlugin({
				env,
				NODE_ENV: 'production'
			}),
			resolveExtensionsPlugin({
				typescript: true,
				index: true
			}),
			fastCjsPlugin({
				// Only transpile CommonJS in node_modules and explicit .cjs files:
				include: /(?:^[\b]npm\/|[/\\]node_modules[/\\]|\.cjs$)/
			}),
			npmPlugin({ external: false }),
			urlPlugin({}),
			jsonPlugin(),
			bundlePlugin({ cwd }),
			optimizeGraphPlugin({ publicPath: '/' }),
			minifyCssPlugin({ sourcemap })
		].concat(plugins || [])
	});

	/** @type {import('rollup').OutputOptions} */
	const outputConfig = {
		entryFileNames: '[name].[hash].js',
		chunkFileNames: 'chunks/[name].[hash].js',
		assetFileNames: 'assets/[name].[hash][extname]',
		compact: true,
		hoistTransitiveImports: true,
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
	};

	const result = await bundle.write(outputConfig);

	if (output) {
		if (!Array.isArray(output)) output = [output];
		if (output.length) {
			await Promise.all(
				output.map(output => {
					if (typeof output === 'function') {
						output = output({ ...outputConfig });
					}
					return bundle.write(output);
				})
			);
		}
	}

	return result;
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
