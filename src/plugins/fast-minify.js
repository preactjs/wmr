// import terser from 'terser';
import { transform, keepalive } from '../lib/esbuild-service.js';

/**
 * @param {import('rollup').PluginContext} rollupContext
 * @param {{ code?: string, map?: any, warnings?: any[], error?: any }} result
 */
function normalizeResult(rollupContext, result) {
	if (result.error) rollupContext.error(result.error);
	if (result.warnings) for (const warn of result.warnings) rollupContext.warn(warn);
	const map = result.map && typeof result.map === 'string' ? JSON.parse(result.map) : result.map || null;
	return { code: result.code, map };
}

/** @returns {import('rollup').Plugin} */
export default function fastMinifyPlugin({ sourcemap = false, warnThreshold = 50, compress = false } = {}) {
	return {
		name: 'fast-minify',
		buildStart() {
			keepalive();
		},
		async transform(code, id) {
			if (!/\.tsx?$/.test(id)) return null;
			const out = await transform(code, {
				loader: 'tsx',
				minify: false,
				sourcefile: id,
				sourcemap: false,
				strict: false
			});
			return normalizeResult(this, out);
		},
		async renderChunk(code, chunk) {
			const start = Date.now();

			const out = await transform(code, {
				define: {
					process: 'self',
					'process.env': 'self',
					'process.env.NODE_ENV': '"production"'
				},
				minify: !!compress,
				sourcefile: chunk.fileName,
				sourcemap: sourcemap === true,
				strict: false,
				target: 'es6'
				// target: 'es2015' // es5 not supported (yet?)
			});

			// const out = terser.minify(code, {
			// 	sourceMap: sourcemap,
			// 	mangle: true,
			// 	compress: compress && {
			// 		// passes: 2,
			// 		...(compress === true ? {} : compress)
			// 	},
			// 	module: true,
			// 	ecma: 9,
			// 	safari10: true,
			// 	output: {
			// 		comments: false
			// 	}
			// });

			const duration = Date.now() - start;
			if (duration > warnThreshold) {
				this.warn(`minify(${chunk.fileName}) took ${duration}ms`);
			}

			return normalizeResult(this, out);
		}
	};
}
