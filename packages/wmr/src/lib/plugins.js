import path from 'path';
import htmPlugin from '../plugins/htm-plugin.js';
import sucrasePlugin from '../plugins/sucrase-plugin.js';
import wmrClientPlugin from '../plugins/wmr/plugin.js';
import wmrStylesPlugin from '../plugins/wmr/styles/styles-plugin.js';
import sassPlugin from '../plugins/sass-plugin.js';
import publicPathPlugin from '../plugins/public-path-plugin.js';
import minifyCssPlugin from '../plugins/minify-css-plugin.js';
import htmlEntriesPlugin from '../plugins/html-entries-plugin.js';
import aliasPlugin from '../plugins/aliases-plugin.js';
import processGlobalPlugin from '../plugins/process-global-plugin.js';
import urlPlugin from '../plugins/url-plugin.js';
import resolveExtensionsPlugin from '../plugins/resolve-extensions-plugin.js';
import fastCjsPlugin from '../plugins/fast-cjs-plugin.js';
import bundlePlugin from '../plugins/bundle-plugin.js';
import jsonPlugin from '../plugins/json-plugin.js';
import optimizeGraphPlugin from '../plugins/optimize-graph-plugin.js';
import externalUrlsPlugin from '../plugins/external-urls-plugin.js';
import copyAssetsPlugin from '../plugins/copy-assets-plugin.js';
import nodeBuiltinsPlugin from '../plugins/node-builtins-plugin.js';
import dynamicImportVars from '@rollup/plugin-dynamic-import-vars';
import visualizer from 'rollup-plugin-visualizer';
import { defaultLoaders } from './default-loaders.js';
import { importAssertionPlugin } from '../plugins/import-assertion.js';
import { acornDefaultPlugins } from './acorn-default-plugins.js';
import { prefreshPlugin } from '../plugins/preact/prefresh.js';
import { absolutePathPlugin } from '../plugins/absolute-path-plugin.js';
import { lessPlugin } from '../plugins/less-plugin.js';
import { workerPlugin } from '../plugins/worker-plugin.js';
import { npmPlugin } from '../plugins/npm-plugin/index.js';
import tsConfigPathsPlugin from '../plugins/tsconfig-paths-plugin.js';
import { getNpmPlugins } from '../plugins/npm-plugin/npm-bundle.js';
import { finalizeDev } from '../plugins/finalize-dev.js';

/**
 * @param {import("wmr").Options & { isIIFEWorker?: boolean, prefixes: Set<string> }} options
 * @returns {import("wmr").Plugin[]}
 */
export function getPlugins(options) {
	const {
		plugins,
		publicPath,
		alias,
		cwd,
		root,
		env,
		minify,
		mode,
		isIIFEWorker = false,
		sourcemap,
		features,
		visualize,
		autoInstall,
		registry,
		prefixes
	} = options;

	const npmCacheDir = path.join(cwd, '.cache', '@npm');

	/**
	 * Map of package name to folder on disk
	 * @type {Map<string, string>}
	 */
	const resolutionCache = new Map();

	// Plugins are pre-sorted
	let split = plugins.findIndex(p => p.enforce === 'post');
	if (split === -1) split = plugins.length;

	const production = mode === 'build';
	const mergedAssets = new Set();

	return [
		acornDefaultPlugins(),
		...plugins.slice(0, split),
		// Skip injecting a client for iife workers
		!isIIFEWorker && features.preact && !production && prefreshPlugin({ sourcemap }),
		production && htmlEntriesPlugin({ root, publicPath, mergedAssets, sourcemap }),
		externalUrlsPlugin(),
		nodeBuiltinsPlugin({ production }),
		urlPlugin({ inline: !production, root, alias }),
		jsonPlugin({ root }),
		bundlePlugin({ inline: !production, cwd: root }),
		absolutePathPlugin({ root }),
		tsConfigPathsPlugin({ cwd: root }),
		aliasPlugin({ alias }),
		sucrasePlugin({
			typescript: true,
			sourcemap,
			production
		}),
		// Transpile import assertion syntax to WMR prefixes
		importAssertionPlugin({ sourcemap }),
		production &&
			(dynamicImportVars.default || dynamicImportVars)({
				include: /\.(m?jsx?|tsx?)$/,
				exclude: /\/node_modules\//
			}),
		production && publicPathPlugin({ publicPath }),
		sassPlugin({ production, sourcemap, root, mergedAssets }),
		lessPlugin({ sourcemap, mergedAssets, alias }),
		wmrStylesPlugin({ hot: !production, root, production, alias, sourcemap }),
		processGlobalPlugin({
			sourcemap,
			env,
			NODE_ENV: production ? 'production' : 'development'
		}),
		// Nested workers are not supported at the moment
		!isIIFEWorker && workerPlugin(options),
		htmPlugin({ production, sourcemap: options.sourcemap }),
		// Skip injecting a client for iife workers
		!isIIFEWorker && wmrClientPlugin({ hot: !production, sourcemap: options.sourcemap }),
		fastCjsPlugin({
			// Only transpile CommonJS in node_modules and explicit .cjs files:
			include: /(^npm\/|[/\\]node_modules[/\\]|\.cjs$)/
		}),

		...(production
			? getNpmPlugins({
					autoInstall,
					production,
					cacheDir: npmCacheDir,
					cwd,
					registryUrl: registry,
					resolutionCache,
					browserReplacement: new Map()
			  })
			: []),
		!production &&
			npmPlugin({ cwd, cacheDir: npmCacheDir, autoInstall, production, registryUrl: registry, resolutionCache, alias }),
		resolveExtensionsPlugin({
			root,
			extensions: options.resolve.extensions
		}),

		...plugins.slice(split),

		// Apply default loaders to unprefixed paths
		defaultLoaders(),
		!production && finalizeDev({ root, prefixes, extensions: options.resolve.extensions }),

		production && optimizeGraphPlugin({ publicPath }),
		minify && minifyCssPlugin({ sourcemap }),
		production && copyAssetsPlugin({ root, mergedAssets }),
		production &&
			visualize &&
			(visualizer.default || visualizer)({
				// Don't open in unit tests
				open: process.env.NODE_ENV !== 'test',
				gzipSize: true,
				brotliSize: true
			})
	].filter(Boolean);
}
