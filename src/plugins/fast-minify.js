import { transform, keepalive } from '../lib/esbuild-service.js';
import terser from 'terser';
import { normalizeResult } from './fast-types.js';

/** @returns {import('rollup').Plugin} */
export default function fastMinifyPlugin({ production, sourcemap = false, warnThreshold = 50, compress = false } = {}) {
	return {
		name: 'fast-minify',
		buildStart() {
			if (!production) keepalive();
		},
		async renderChunk(code, chunk) {
			const start = Date.now();

			let out;
			if (production) {
				out = terser.minify(code, {
					sourceMap: sourcemap === true,
					mangle: true,
					compress,
					module: true,
					ecma: 9,
					safari10: true,
					output: {
						comments: false
					}
				});
			} else {
				out = await transform(code, {
					minify: !!compress,
					sourcefile: chunk.fileName,
					sourcemap: sourcemap === true,
					target: 'es6'
				});
			}

			const duration = Date.now() - start;
			if (duration > warnThreshold && process.env.DEBUG) {
				this.warn(`minify(${chunk.fileName}) took ${duration}ms`);
			}

			return normalizeResult(this, out);
		}
	};
}
