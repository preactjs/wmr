const BUILTINS = {
	fs: `export default {}`,
	http: `export default {}`,
	https: `export default {}`,
	url: `export default {}`,
	util: `export default {}`,
	zlib: `export default {}`
};

/**
 * Stub out Node built-ins.
 * @param {object} [options]
 * @returns {import('rollup').Plugin}
 */
export default function nodeBuiltinsPlugin({} = {}) {
	return {
		name: 'node-builtins',
		resolveId(id) {
			if (BUILTINS.hasOwnProperty(id)) return id;
		},
		load(id) {
			if (BUILTINS.hasOwnProperty(id)) {
				return {
					code: BUILTINS[id],
					moduleSideEffects: false,
					syntheticNamedExports: true
				};
			}
		}
	};
}
