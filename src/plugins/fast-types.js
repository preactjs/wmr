import { transform, keepalive } from '../lib/esbuild-service.js';

/**
 * @param {import('rollup').PluginContext} rollupContext
 * @param {{ code?: string, map?: any, warnings?: any[], error?: any }} result
 */
export function normalizeResult(rollupContext, result) {
	if (result.error) rollupContext.error(result.error);
	if (result.warnings) for (const warn of result.warnings) rollupContext.warn(warn);
	const map = result.map && typeof result.map === 'string' ? JSON.parse(result.map) : result.map || null;
	return { code: result.code, map };
}

/** @returns {import('rollup').Plugin} */
export default function fastTypesPlugin({ production, sourcemap = false, warnThreshold = 50, compress = false } = {}) {
	return {
		name: 'fast-types',
		buildStart() {
			keepalive();
		},
		async transform(code, id) {
			if (!/\.tsx?$/.test(id)) return null;
			const out = await transform(code, {
				loader: 'tsx',
				minify: false,
				sourcefile: id,
				sourcemap: false,
				jsxFactory: ''
			});

			return normalizeResult(this, out);
		}
	};
}
