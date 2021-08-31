import { posix } from 'path';
import cssnano from '../lib/cssnano-lite.js';
import postcss from 'postcss';
import { STYLE_REG } from './wmr/styles/styles-plugin.js';

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
				if (resolved) {
					resolved.id = 'css:' + resolved.id;
					return resolved;
				}
			}
		},

		async generateBundle(_, bundle) {
			await Promise.all(
				Object.values(bundle).map(async asset => {
					if (asset.type !== 'asset' || !isCssFilename(asset.fileName)) return;
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
					} catch (err) {
						return handleError(this, err);
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

/** @param {import('rollup').PluginContext} rollupContext */
function handleError(rollupContext, error) {
	if (error.line == null || error.column == null) throw error;
	const lines = error.source.split('\n');
	const line = error.line - 1;
	const frame = [
		lines[line - 2] || '',
		lines[line - 1] || '',
		lines[line],
		'-'.repeat(error.column - 1) + '^',
		lines[line + 1] || '',
		lines[line + 2] || ''
	];
	const err = Error(error.message + '\n> ' + frame.join('\n> '));
	rollupContext.error(err, { line: error.line, column: error.column });
}

const isCssFilename = fileName => STYLE_REG.test(fileName);
