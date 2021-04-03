import { promises as fs } from 'fs';
import * as path from 'path';
import htmPlugin from '../plugins/htm-plugin.js';
import sucrasePlugin from '../plugins/sucrase-plugin.js';
import wmrPlugin from '../plugins/wmr/plugin.js';
import wmrStylesPlugin from '../plugins/wmr/styles-plugin.js';
import sassPlugin from '../plugins/sass-plugin.js';
import npmPlugin from '../plugins/npm-plugin/index.js';
import publicPathPlugin from '../plugins/public-path-plugin.js';
import minifyCssPlugin from '../plugins/minify-css-plugin.js';
import htmlEntriesPlugin from '../plugins/html-entries-plugin.js';
import aliasesPlugin from '../plugins/aliases-plugin.js';
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

/**
 * @param {import("wmr").Options} options
 * @returns {import("wmr").Plugin[]}
 */
export function getPlugins(options) {
	const { plugins, cwd, publicPath, aliases, root, env, minify, mode, sourcemap, features, visualize } = options;

	// Plugins are pre-sorted
	let split = plugins.findIndex(p => p.enforce === 'post');
	if (split === -1) split = plugins.length;

	const production = mode === 'build';

	return [
		...plugins.slice(0, split),
		production && htmlEntriesPlugin({ cwd, publicPath }),
		externalUrlsPlugin(),
		nodeBuiltinsPlugin({ production }),
		urlPlugin({ inline: !production, cwd }),
		jsonPlugin({ cwd }),
		bundlePlugin({ inline: !production, cwd }),
		aliasesPlugin({ aliases, cwd: root }),
		sucrasePlugin({
			typescript: true,
			sourcemap,
			production
		}),
		production &&
			(dynamicImportVars.default || dynamicImportVars)({
				include: /\.(m?jsx?|tsx?)$/,
				exclude: /\/node_modules\//
			}),
		production && publicPathPlugin({ publicPath }),
		sassPlugin({ production }),
		production && wmrStylesPlugin({ hot: false, cwd }),
		processGlobalPlugin({
			env,
			NODE_ENV: production ? 'production' : 'development'
		}),
		htmPlugin({ production }),
		wmrPlugin({ hot: !production, preact: features.preact }),
		fastCjsPlugin({
			// Only transpile CommonJS in node_modules and explicit .cjs files:
			include: /(?:^[\b]npm\/|[/\\]node_modules[/\\]|\.cjs$)/
		}),
		production && npmPlugin({ external: false }),
		resolveExtensionsPlugin({
			typescript: true,
			index: true
		}),

		...plugins.slice(split),

		// Apply default loaders to unprefixed paths
		defaultLoaders(),

		production && optimizeGraphPlugin({ publicPath }),
		minify && minifyCssPlugin({ sourcemap }),
		production && copyAssetsPlugin({ cwd }),
		production && visualize && visualizer({ open: true, gzipSize: true, brotliSize: true })
	].filter(Boolean);
}

/**
 * Check if a file exists on disk
 * @param {string} filePath
 * @returns {Promise<boolean>}
 */
export function fileExists(filePath) {
	return fs
		.access(filePath)
		.then(() => true)
		.catch(() => false);
}

/**
 * Ensure that a file path resolves to a file in one of the allowed
 * directories to include files from.
 * @param {string} file
 * @param {string[]} includeDirs
 */
export async function resolveFile(file, includeDirs) {
	file = path.normalize(file);

	for (const dir of includeDirs) {
		const resolved = path.resolve(dir, file);
		if (resolved.startsWith(dir) && (await fileExists(resolved))) {
			return resolved;
		}
	}

	const err = new Error(
		`Unable to resolve ${file}. Files must be placed in one of the following directories:\n` +
			`  ${includeDirs.join('\n  ')}`
	);
	// Used by top level error handler to rewrite it to a 404
	err.code = 'ENOENT';
	throw err;
}
