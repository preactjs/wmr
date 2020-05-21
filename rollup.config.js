import commonjs from '@rollup/plugin-commonjs';
import nodeResolve from '@rollup/plugin-node-resolve';
import json from '@rollup/plugin-json';
import terser from 'terser';

/** @type {import('rollup').RollupOptions} */
const config = {
	input: 'src/index.js',
	inlineDynamicImports: true,
	output: {
		file: 'wmr.js',
		format: 'cjs',
		compact: true,
		plugins: [
			{
				name: 'minify',
				renderChunk(code) {
					return terser.minify(code, {
						compress: true,
						mangle: true,
						sourceMap: false,
						output: { comments: false }
					}).code;
				}
			}
		]
	},
	external: [
		'fsevents',
	],
	plugins: [
		commonjs({
			ignore: [
				f => f.endsWith('.mjs')
			]
		}),
		nodeResolve({
			preferBuiltins: true
		}),
		json()
	]
};

export default config;
