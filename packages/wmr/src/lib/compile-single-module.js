import * as rollup from 'rollup';
import wmrPlugin from '../plugins/wmr/plugin.js';
import htmPlugin from '../plugins/htm-plugin.js';
import sucrasePlugin from '../plugins/sucrase-plugin.js';
// import localNpmPlugin from './plugins/local-npm-plugin.js';

// disabled for now
const withCache = fn => fn;

const ROLLUP_FAST_OUTPUT = {
	compact: true,
	hoistTransitiveImports: false,
	indent: false,
	interop: false,
	minifyInternalExports: false,
	preferConst: true,
	sourcemap: false
};

// @TODO: this cache needs to be sharded by `input` in order to actually do anything when `preserveModules:true` is enabled
let cache;

export const compileSingleModule = withCache(async (input, { cwd, out, hmr = true }) => {
	input = input.replace(/\.css\.js$/, '.css');
	// console.log('compiling ' + input);
	const bundle = await rollup.rollup({
		input,
		treeshake: false,
		preserveModules: true,
		// these should theroetically improve performance:
		inlineDynamicImports: false,
		preserveEntrySignatures: 'strict',
		cache,
		// perf: true,
		// external: () => true,
		plugins: [
			{
				name: 'wmr-single-file-resolver',
				resolveId(id) {
					if (id == input) return null;
					// hmr client
					if (id === 'wmr') id = '/_wmr.js';
					// bare specifier = npm dep
					else if (!/^\.?\.?(\/|$)/.test(id)) id = `/@npm/${id}`;
					// relative imports (css)
					else if (/\.css$/.test(id)) id += '.js';
					return { id, external: true, moduleSideEffects: true };
				}
			},
			sucrasePlugin({
				typescript: true,
				sourcemap: false,
				production: false
			}),
			// localNpmPlugin(),
			// wmrStylesPlugin({ cwd }),
			hmr && wmrPlugin(),
			htmPlugin()
		].filter(Boolean)
	});
	cache = bundle.cache;
	const result = await bundle.write({
		...ROLLUP_FAST_OUTPUT,
		dir: out,
		assetFileNames: '[name].[ext]',
		paths: str => str,
		format: 'es'
	});
	return result.output[0].code;
});

/*
const PLUGINS = [
	{
		name: 'wmr-styles-dynamic',
		resolveId(id, importer) {
			// entry:
			if (!importer) return null;
			if (/\.css$/.test(id)) {
				return { id: id + '.js', external: true };
			}
			if (/^\.?\.?(\/|$)/.test(id)) {
				return { id, external: true };
			}
			if (id === 'wmr') id = '/_wmr.js';
			else id = `/@npm/${id}`;
			return { id, external: true, moduleSideEffects: true };
			// return false;
		}
	},
	// localNpmPlugin({
	// 	// publicPath: '/@npm'
	// }),
	// wmrStylesPlugin({ cwd }),
	wmrPlugin(),
	htmPlugin()
];
*/
