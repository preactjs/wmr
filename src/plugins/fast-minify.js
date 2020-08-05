import terser from 'terser';
// import { transform } from '../lib/esbuild-service.js';
// import { transform } from '../lib/terser-service.js';

/**
 * @param {object} [options]
 * @param {boolean} [options.sourcemap = false]
 * @param {number} [options.warnThreshold] Log a warning to the console if minification takes longer than X ms
 * @param {boolean} [options.compress = false] Enable compression (Terser-specific)
 * @param {5|2015|2016|2017|2018|2019|2020} [options.ecma = 2017] Target ECMAScript version
 * @returns {import('rollup').Plugin}
 */
export default function fastMinifyPlugin({ sourcemap, warnThreshold = 50, compress, ecma } = {}) {
	return {
		name: 'fast-minify',

		async renderChunk(code, chunk) {
			const start = Date.now();

			// const out = await transform(code, {
			// 	define: {
			// 		process: 'self',
			// 		'process.env': 'self',
			// 		'process.env.NODE_ENV': '"production"'
			// 	},
			// 	minify: !!compress,
			// 	sourcefile: chunk.fileName,
			// 	sourcemap: !!sourcemap,
			// 	strict: false,
			// 	target: `es${ecma || 2017}` // 'es5' not fully supported (yet?)
			// });

			// const out = await transform(code, {
			const out = terser.minify(code, {
				sourceMap: !!sourcemap,
				mangle: true,
				compress: !!compress,
				module: true,
				ecma: ecma || 2017,
				safari10: true,
				parse: {
					html5_comments: false
				},
				output: {
					inline_script: false,
					comments: false
				}
			});

			const duration = Date.now() - start;
			if (duration > warnThreshold) {
				this.warn(`minify(${chunk.fileName}) took ${duration}ms`);
			}

			if (out.error) this.error(out.error);
			if (out.warnings) for (const warn of out.warnings) this.warn(warn);
			const map = out.map && typeof out.map === 'string' ? JSON.parse(out.map) : out.map || null;
			return { code: out.code, map };
		}
	};
}
