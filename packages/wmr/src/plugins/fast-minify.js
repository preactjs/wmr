import { minify } from 'terser';
import { hasDebugFlag } from '../lib/output-utils.js';

/** @returns {import('rollup').Plugin} */
export default function fastMinifyPlugin({ sourcemap = false, warnThreshold = 50, compress = false } = {}) {
	return {
		name: 'fast-minify',
		async renderChunk(code, chunk) {
			let out, duration;
			try {
				// We only time the synhronous region here, because Terser is actually synchronous.
				// (measuring `await` would return the cumulative time taken by all minify() calls).
				const start = Date.now();
				const p = minify(code, {
					sourceMap: sourcemap,
					mangle: true,
					compress,
					module: true,
					ecma: 2018,
					safari10: true,
					parse: {
						bare_returns: false,
						html5_comments: false,
						shebang: false
					},
					output: {
						comments: false
					}
				});
				duration = Date.now() - start;
				out = await p;
			} catch (err) {
				return this.error(err);
			}

			if (!out.code) out.code = code;

			if (duration > warnThreshold && hasDebugFlag()) {
				this.warn(`minify(${chunk.fileName}) took ${duration}ms`);
			}
			const map = typeof out.map === 'string' ? JSON.parse(out.map) : out.map || null;
			return { code: out.code, map };
		}
	};
}
