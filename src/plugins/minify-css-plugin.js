import cssnano from 'cssnano';

export default function cssEntriesPlugin() {
	return {
		name: 'minify-styles',
		async transform(code, id) {
			if (!/.css$/.test(id) || /.module.css$/.test(id)) return;

			const result = await cssnano.process(code, { from: id, to: id });
			return {
				code: result.css,
				map: result.map || { mappings: '' }
			};
		}
	};
}
