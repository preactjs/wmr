import { transform } from '../lib/esbuild-service.js';

/** @returns {import('rollup').Plugin} */
export default function fastMinifyPlugin({ sourcemap = false, warnThreshold = 50, compress = false } = {}) {
	return {
		name: 'fast-minify',
		async renderChunk(code, chunk) {
			const start = Date.now();

			const out = await transform(code, {
				minify: !!compress,
				sourcefile: chunk.fileName,
				sourcemap: sourcemap === true,
				target: 'es6'
			});

			// TODO: Check if tersers typings are wrong
			if (!out.code) out.code = '';

			const duration = Date.now() - start;
			if (out.error) this.error(out.error);
			if (out.warnings) for (const warn of out.warnings) this.warn(warn);
			if (duration > warnThreshold && process.env.DEBUG) {
				this.warn(`minify(${chunk.fileName}) took ${duration}ms`);
			}
			const map = typeof out.map === 'string' ? JSON.parse(out.map) : out.map || null;
			return { code: out.code, map };
		}
	};
}
