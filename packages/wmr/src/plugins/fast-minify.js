import { transform } from '@swc/core';

/** @returns {import('rollup').Plugin} */
export default function fastMinifyPlugin({ sourcemap = false, warnThreshold = 50, compress = false } = {}) {
	return {
		name: 'fast-minify',
		async renderChunk(code, chunk) {
			const start = Date.now();

			const out = await transform(code, {
				jsc: {
					parser: {
						dynamicImport: true
					}
				},
				minify: true
			});

			const duration = Date.now() - start;
			if (out.error) this.error(out.error);
			if (out.warnings) for (const warn of out.warnings) this.warn(warn);
			if (duration > warnThreshold && process.env.DEBUG) {
				this.warn(`minify(${chunk.fileName}) took ${duration}ms`);
			}
			return out;
		}
	};
}
