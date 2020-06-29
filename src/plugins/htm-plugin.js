import acornJsx from 'acorn-jsx';
import { transform } from '../lib/acorn-traverse.js';
import transformJsxToHtm from './transform-jsx-to-htm.js';

/**
 * Convert JSX to HTM
 * @param {object} [options]
 * @param {RegExp | ((filename: string) => boolean)} [options.include] Controls whether files are processed to transform JSX.
 * @returns {import('rollup').Plugin}
 */
export default function htmPlugin({ include } = {}) {
	return {
		name: 'htm-plugin',

		options(opts) {
			opts.acornInjectPlugins = [acornJsx()].concat(
				// @ts-ignore
				opts.acornInjectPlugins || []
			);
			return opts;
		},

		transform(code, filename) {
			// skip internal modules
			if (filename[0] === '\0') return;

			if (include) {
				const shouldTransform = typeof include === 'function' ? include(filename) : filename.match(include);
				if (!shouldTransform) return;
			}

			const start = Date.now();

			const out = transform(code, {
				plugins: [transformJsxToHtm],
				filename,
				sourceMaps: true,
				parse: this.parse
			});

			// Explicitly drop prefresh inclusion hint if we transformed JSX:
			// if (out.code !== code) {
			// 	out.code += '\n/*@@prefresh_include*/';
			// 	// doesn't work with Rollup:
			// 	this.getModuleInfo(filename).hasJSX = true;
			// }

			const end = Date.now();
			if (end - start > 50) this.warn(`${filename} took ${end - start}ms`);
			return out;
		}
	};
}
