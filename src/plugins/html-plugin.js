import { promises as fs } from 'fs';
import { posix } from 'path';
import posthtml from 'posthtml';
import posthtmlUrls from 'posthtml-urls';

const isLocalFile = src => src && !/^([a-z]+:)\/\//i.test(src);

/**
 * This Rollup plugin handles resolving HTML entrypoints.
 *
 * It works by returning an empty JS module in place of the HTML,
 * then passing the HTML through emitFile() as an asset.
 *
 * It also finds scripts and styles in the HTML and passes them to Rollup
 * as entrypoints, then updates the built HTML with the generated filenames.
 *
 * Finally, the empty JS modules from each HTML entry are removed from the bundle.
 *
 * @param {object} options
 * @param {string} [options.cwd]
 * @param {string} [options.publicDir]
 * @param {string} [options.publicPath] Prepend to generated filenames
 * @returns {import('rollup').Plugin}
 */
export default function htmlPlugin({ cwd, publicDir, publicPath } = {}) {
	return {
		name: 'html-entries',
		async resolveId(id, importer) {
			if (!/\.html$/.test(id) || importer) return;
			const resolved = await this.resolve(id, importer, { skipSelf: true });
			if (resolved) return '\0htmlentry:' + resolved.id;
		},

		async load(id) {
			if (!id.startsWith('\0htmlentry:')) return;

			id = id.substring(11);

			const html = await fs.readFile(id, 'utf-8');
			const waiting = [];
			let previousScriptId;

			const transformed = await posthtml([
				posthtmlUrls({
					eachURL: async (url, attr, element) => {
						if (!isLocalFile(url)) return;

						let abs = url;
						if (url[0] === '/') {
							url = url.substring(1);
							abs = posix.join(publicDir || cwd, url);
						} else {
							if (!/^\.?\.\//.test(url)) url = './' + url;
							abs = posix.resolve(posix.dirname(id), url);
						}

						if (element === 'script' && attr === 'src' && /\.[jt]sx?$/.test(url)) {
							const ref = this.emitFile({
								type: 'chunk',
								id: abs,
								implicitlyLoadedAfterOneOf: previousScriptId && [previousScriptId]
							});
							previousScriptId = abs;
							return `/__ASSET__/${ref}`;
						}
						if (element === 'link' && attr === 'href' && /\.css$/.test(url)) {
							const ref = this.emitFile({
								type: 'asset',
								name: url
							});
							waiting.push(
								fs.readFile(abs, 'utf-8').then(source => {
									this.setAssetSource(ref, source);
								})
							);
							return `/__ASSET__/${ref}`;
						}
					}
				})
			]).process(html);

			await Promise.all(waiting);

			this.emitFile({
				type: 'asset',
				fileName: posix.relative(publicDir || cwd, id),
				source: transformed.html
			});

			return 'console.log(1)';
		},
		async generateBundle(_, bundle) {
			for (const id in bundle) {
				const asset = bundle[id];
				// remove the empty JS chunk:
				if (asset.type === 'chunk' && asset.facadeModuleId && asset.facadeModuleId.startsWith('\0htmlentry:')) {
					delete bundle[id];
				}
				// replace asset references with their generated URLs:
				if (asset.type === 'asset' && asset.fileName.match(/\.html$/)) {
					let html = asset.source.toString();
					html = html.replace(/\/__ASSET__\/(\w+)/g, (str, id) => {
						let filename = this.getFileName(id);
						if (!filename) return str;
						if (publicPath) filename = publicPath + filename;
						return filename;
					});
					asset.source = html;
				}
			}
		}
	};
}
