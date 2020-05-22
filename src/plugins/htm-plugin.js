import acornJsx from 'acorn-jsx';
import { transform } from './acorn-traverse.js';
import transformJsxToHtm from './transform-jsx-to-htm.js';

/**
 * Convert JSX to HTM
 * @param {object} [options]
 * @param {RegExp | ((filename: string) => boolean)} [options.include]
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
			if (include) {
				const shouldTransform = typeof include === 'function' ? include(filename) : filename.match(include);
				if (!shouldTransform) return;
			}

			const start = Date.now();

			// const out = processJsx(this.parse(code), new MagicString(code));

			const out = transform(code, {
				plugins: [transformJsxToHtm],
				filename,
				sourceMaps: true,
				parse: this.parse
			});

			const end = Date.now();
			if (end - start > 50) {
				console.log(`transform(${filename}): ${end - start}ms`);
			}
			return out;
		}
	};
}
