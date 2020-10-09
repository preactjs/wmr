import { posix } from 'path';
import cssnano from '../lib/cssnano-lite.js';
import postcss from 'postcss';

const processor = postcss(cssnano());

/**
 * @param {object} [options]
 * @param {boolean} [options.sourcemap = false]
 * @returns {import('rollup').Plugin}
 */
export default function minifyCssPlugin({ sourcemap } = {}) {
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
					if (asset.type !== 'asset' || !/\.(css|s[ac]ss)$/.test(asset.fileName)) return;
					const id = asset.fileName;
					const mapFile = asset.fileName + '.map';
					let result;
					try {
						result = await processor.process(asset.source, {
							from: id,
							to: id,
							map: sourcemap && {
								annotation: posix.basename(mapFile),
								from: posix.basename(mapFile),
								sourcesContent: false
							}
						});
					} catch (e) {
						if (e.line != null && e.column != null) {
							const lines = e.source.split('\n');
							const line = e.line - 1;
							const frame = [
								lines[line - 2] || '',
								lines[line - 1] || '',
								lines[line],
								'-'.repeat(e.column - 1) + '^',
								lines[line + 1] || '',
								lines[line + 2] || ''
							];
							const err = Error(e.message + '\n> ' + frame.join('\n> '));
							return this.error(err, { line: e.line, column: e.column });
						}
						throw e;
					}
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
