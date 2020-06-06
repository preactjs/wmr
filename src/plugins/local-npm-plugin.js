/** @returns {import('rollup').Plugin} */
export default function localNpmPlugin({ publicPath = '/@npm' } = {}) {
	return {
		name: 'localNpmPlugin',
		options(opts) {
			// opts.external = [/^\/@module\//].concat(opts.external || []);
			opts.external = [new RegExp(`^${publicPath.replace(/([[\]()-.*+])/g, '\\$1')}`)].concat(opts.external || []);
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
			};
			return opts;
		},
		async resolveId(s) {
			if (s.match(/^\.?\//)) return;
			// s = s.replace(/^https?:\/\/unpkg\.com\/((?:@[^@\/?]+\/)?[^@\/?]+)(@[^\/?]+)?(\/[^?]+)?\?module/g, '$1$2$3');
			return {
				id: `${publicPath}/${s}`,
				external: true
			};
		}
	};
}
