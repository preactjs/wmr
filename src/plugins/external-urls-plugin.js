/** @returns {import('rollup').Plugin} */
export default function externalUrlsPlugin() {
	return {
		name: 'external-urls',
		resolveId(id) {
			if (/^(https?:)?\/\//.test(id)) {
				return {
					id,
					external: true
				};
			}
		}
	};
}
