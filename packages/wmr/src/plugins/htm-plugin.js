import acornJsx from 'acorn-jsx';
import { transform } from '../lib/acorn-traverse.js';
import transformJsxToHtm from 'babel-plugin-transform-jsx-to-htm';
import transformJsxToHtmLite from '../lib/transform-jsx-to-htm-lite.js';

/**
 * Convert JSX to HTM
 * @param {object} options
 * @param {RegExp | ((filename: string) => boolean)} [options.include] Controls whether files are processed to transform JSX.
 * @param {string} options.importSource
 * @param {string} options.pragma
 * @param {boolean} [options.production = true] If `false`, a simpler whitespace-preserving transform is used.
 * @returns {import('rollup').Plugin}
 */
export default function htmPlugin({ include, pragma, importSource, production = true }) {
	const VIRTUAL = 'htm-jsx-factory';
	// Workaround to make wmrMiddleware make this fall into Transform.js
	const VIRTUAL_FILE = 'htm-jsx-factory.js';

	return {
		name: 'htm-plugin',

		options(opts) {
			opts.acornInjectPlugins = [acornJsx()].concat(
				// @ts-ignore
				opts.acornInjectPlugins || []
			);
			return opts;
		},

		resolveId(id) {
			if (id === VIRTUAL) {
				return VIRTUAL_FILE;
			}
		},

		load(id) {
			if (id === VIRTUAL_FILE) {
				return `
import htm from "htm";
import { ${pragma} } from "${importSource}";
export const html = htm.bind(${pragma});`;
			}
		},

		transform(code, filename) {
			if (!/\.[tj]sx?$/.test(filename)) return;

			// skip internal modules
			if (filename[0] === '\0' || filename[0] === '\b') return;

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
								module: VIRTUAL,
								export: 'html'
							},
							// avoid a variable collisions:
							tag: '$$html',
							terse: true
						}
					]
				],
				filename,
				sourceMaps: true,
				generatorOpts: {
					compact: production
				},
				parse: this.parse
			});

			// Explicitly drop prefresh inclusion hint if we transformed JSX:
			// if (out.code !== code) {
			// 	out.code += '\n/*@@prefresh_include*/';
			// 	// doesn't work with Rollup:
			// 	this.getModuleInfo(filename).hasJSX = true;
			// }

			const end = Date.now();
			if (end - start > 100) this.warn(`${filename} took ${end - start}ms`);
			return out;
		}
	};
}
