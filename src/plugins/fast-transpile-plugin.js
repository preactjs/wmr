import { transform, keepalive } from '../lib/esbuild-service.js';

/**
 * When using esbuild
 * @param {object} [options]
 * @param {boolean} [options.sourcemap = false]
 * @returns {import('rollup').Plugin}
 */
export function fastTranspilePlugin({ sourcemap } = {}) {
	return {
		name: 'fast-transpile',

		buildStart() {
			keepalive();
		},

		async transform(code, id) {
			if (!/\.tsx?$/.test(id)) return null;

			const out = await transform(code, {
				loader: 'tsx',
				minify: false,
				sourcefile: id,
				sourcemap: !!sourcemap,
				strict: false
			});

			if (out.error) this.error(out.error);
			if (out.warnings) for (const warn of out.warnings) this.warn(warn);
			const map = out.map && typeof out.map === 'string' ? JSON.parse(out.map) : out.map || null;
			return { code: out.code, map };
		}
	};
}
