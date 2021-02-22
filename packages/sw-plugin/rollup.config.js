import { resolve } from 'path';
import commonjs from '@rollup/plugin-commonjs';
import nodeResolve from '@rollup/plugin-node-resolve';
import builtins from 'builtin-modules';

/** @type {import('rollup').RollupOptions} */
const config = {
	input: 'src/index.js',
	inlineDynamicImports: true,
	output: {
		file: 'sw-plugin.cjs',
		format: 'cjs',
		compact: true,
		freeze: false,
		interop: false,
		namespaceToStringTag: false,
		externalLiveBindings: false,
		preferConst: true
	},
	external: [...builtins, 'wmr', 'rollup'],
	plugins: [
		commonjs({
			exclude: [/\.mjs$/, /\/rollup\//, resolve('src')],
			ignore: builtins,
			transformMixedEsModules: true
		}),
		nodeResolve({
			preferBuiltins: true,
			extensions: ['.mjs', '.js', '.json', '.es6', '.node']
		}),
	]
};

export default config;
