import prefreshBabelPlugin from '@prefresh/babel-plugin';
import { transform } from '../../lib/acorn-traverse.js';

/**
 * Inject Prefresh runtime for on the fly hot module reloading
 * of Preact components.
 * @param {object} options
 * @param {boolean} options.sourcemap
 * @returns {import('rollup').Plugin}
 */
export function prefreshPluginV2({ sourcemap }) {
	return {
		name: 'preact-prefresh-next',
		transform(code, id) {
			if (!/\.([tj]sx?|[mc]js)$/.test(id)) return;

			if (process.env.BYPASS_HMR === 'true') return;

			const hasExport = /\bexport\b/.test(code);
			const hasJsx = /<([a-zA-Z][a-zA-Z0-9.:-]*|\$\{.+?\})[^>]*>/.test(code);

			// Only inject into modules with JSX and exports
			if (!hasJsx || !hasExport) return;

			console.log('INPUT', code);
			const res = transform(code, {
				plugins: [[prefreshBabelPlugin, { skipEnvCheck: true }]],
				filename: id,
				parse: this.parse,
				sourceMaps: !!sourcemap
			});

			console.log('OUT', res.code);
			return res;
		}
	};
}
