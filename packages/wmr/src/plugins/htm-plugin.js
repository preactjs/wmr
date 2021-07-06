import acornJsx from 'acorn-jsx';
import { transform } from '../lib/acorn-traverse.js';
import transformJsxToHtm from 'babel-plugin-transform-jsx-to-htm';
import transformJsxToHtmLite from '../lib/transform-jsx-to-htm-lite.js';

/**
 * Convert JSX to HTM
 * @param {object} [options]
 * @param {RegExp | ((filename: string) => boolean)} [options.include] Controls whether files are processed to transform JSX.
 * @param {boolean} [options.production = true] If `false`, a simpler whitespace-preserving transform is used.
 * @param {boolean} [options.sourcemap]
 * @returns {import('rollup').Plugin}
 */
export default function htmPlugin({ include, production = true, sourcemap } = {}) {
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
			if (!/\.[tj]sx?$/.test(filename)) return;

			// skip internal modules
			if (filename[0] === '\0') return;

			if (include) {
				const shouldTransform = typeof include === 'function' ? include(filename) : filename.match(include);
				if (!shouldTransform) return;
			}

			// Note: optimization to skip non-JSX/TSX files that don't contain JSX (remove if extended)
			if (!/\.[tj]sx$/.test(filename) && !/<[a-zA-Z$_][\w.:-]*[^>]*>/.test(code)) {
				return;
			}

			const start = Date.now();

			const jsxTransform = production ? transformJsxToHtm : transformJsxToHtmLite;

			const out = transform(code, {
				plugins: [
					[
						jsxTransform,
						{
							import: {
								module: 'htm/preact',
								export: 'html'
							},
							// avoid a variable collisions:
							tag: '$$html',
							terse: true
						}
					]
				],
				filename,
				// Default is to generate sourcemaps, needs an explicit
				// boolean
				sourceMaps: !!sourcemap,
				generatorOpts: {
					compact: production
				},
				parse: this.parse
			});

			const end = Date.now();
			if (end - start > 100) this.warn(`${filename} took ${end - start}ms`);
			return out;
		}
	};
}
