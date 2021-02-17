/** @returns {import('rollup').Plugin} */
export default function localNpmPlugin({ publicPath = '/@npm' } = {}) {
	return {
		name: 'localNpmPlugin',
		options(opts) {
			// opts.external = [/^\/@module\//].concat(opts.external || []);
			/** @type {import('rollup').InputOptions["external"]} */
			const external = [new RegExp(`^${publicPath.replace(/([[\]()-.*+])/g, '\\$1')}`)];
			if (opts.external && typeof opts.external !== 'function') {
				external.concat(opts.external || []);
			}
			opts.external = external;
			return opts;
		},
		outputOptions(opts) {
			const oldPaths = opts.paths;
			opts.paths = id => {
				if (id.startsWith(publicPath)) {
					return id;
				}
				if (oldPaths) {
					if (typeof oldPaths === 'function') return oldPaths(id);
					return oldPaths[id];
				}

				return id;
			};
			return opts;
		},
		async resolveId(s, importer) {
			if (s.match(/^\.?\//)) return;
			// s = s.replace(/^https?:\/\/unpkg\.com\/((?:@[^@\/?]+\/)?[^@\/?]+)(@[^\/?]+)?(\/[^?]+)?\?module/g, '$1$2$3');
			return {
				id: `${publicPath}/${s}`,
				external: true,
				moduleSideEffects: true,
				syntheticNamedExports: true
			};
		}
	};
}
