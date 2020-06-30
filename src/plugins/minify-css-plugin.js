import cssnano from 'cssnano';

export default function minifyStylesPlugin() {
	return {
		name: 'minify-styles',
		transform(code, id) {
			if (!id.match(/\.css$/)) return;

			return cssnano.process(code);
		}
	};
}
