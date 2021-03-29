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

/**
 * @param {import("wmr").Options} options
 * @returns {import("wmr").Plugin[]}
 */
export function getPlugins(options) {
	const { plugins, cwd, publicPath, aliases, root, env, minify, mode, sourcemap, features } = options;

	// Plugins are pre-sorted
	const split = plugins.findIndex(p => p.enforce === 'post');

	const production = mode === 'build';

	return [
		...plugins.slice(0, split),
		production && htmlEntriesPlugin({ cwd, publicPath }),
		externalUrlsPlugin(),
		nodeBuiltinsPlugin({ production }),
		urlPlugin({ inline: !production, cwd }),
		jsonPlugin({ cwd }),
		bundlePlugin({ inline: !production, cwd }),
		aliasesPlugin({ aliases }),
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

		production && optimizeGraphPlugin({ publicPath }),
		minify && minifyCssPlugin({ sourcemap }),
		production && copyAssetsPlugin({ cwd })
	].filter(Boolean);
}
