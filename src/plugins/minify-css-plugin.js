import { posix } from 'path';
import cssnano from '../lib/cssnano-lite.js';
import postcss from 'postcss';

const processor = postcss([cssnano]);

/** @returns {import('rollup').Plugin} */
export default function minifyCssPlugin() {
	return {
		name: 'minify-css',
		async resolveId(id, importer) {
			if (id.startsWith('css:')) {
				const resolved = await this.resolve(id.substring(4), importer);
				resolved.id = 'css:' + resolved.id;
				return resolved;
			}
		},
		async generateBundle(_, bundle) {
			await Promise.all(
				Object.values(bundle).map(async asset => {
					if (asset.type !== 'asset' || !/\.css$/.test(asset.fileName)) return;
					const id = asset.fileName;
					const mapFile = asset.fileName + '.map';
					const result = await processor.process(asset.source, {
						from: id,
						to: id,
						map: {
							annotation: posix.basename(mapFile),
							from: posix.basename(mapFile),
							sourcesContent: false
						}
					});
					if (result.map) {
						this.emitFile({
							type: 'asset',
							fileName: mapFile,
							source: result.map.toString()
						});
					}
					asset.source = result.css;
				})
			);
		}
	};
}
