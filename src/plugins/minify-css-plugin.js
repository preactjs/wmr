import cssnano from 'cssnano';

export default function cssEntriesPlugin() {
	return {
		async transform(code, id) {
			if (/.css$/.test(id) && !/.module.css$/.test(id)) {
				return { id, code: (await cssnano.process(code, { from: id, to: id })).css };
			}

			return { id, code };
		}
	};
}
