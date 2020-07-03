import { promises as fs } from 'fs';
import { posix } from 'path';
import { transformHtml } from '../lib/transform-html.js';

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
export default function htmlEntriesPlugin({ cwd, publicDir, publicPath } = {}) {
	const ENTRIES = [];

	/** @this {import('rollup').PluginContext} */
	async function handleHtmlEntry(id) {
		if (!/\.html$/.test(id)) return id;

		this.addWatchFile(id);
		id = (await this.resolve(id, null, { skipSelf: true })).id;

		const html = await fs.readFile(id, 'utf-8');
		const waiting = [];
		const scripts = [];

		const transformed = await transformHtml(html, {
			transformUrl: (url, attr, tag, { attrs }) => {
				if (!isLocalFile(url)) return;

				let abs = url;
				if (url[0] === '/') {
					url = './' + url.substring(1);
					abs = posix.join(publicDir || cwd, url);
				} else {
					if (!/^\.?\.\//.test(url)) url = './' + url;
					abs = posix.resolve(posix.dirname(id), url);
				}

				if (tag === 'script' && /^module$/i.test(attrs.type)) {
					const id = ENTRIES.push(abs) - 1;
					scripts.push(abs);
					return `/__ENTRY__/${id}`;
				}
				if (tag === 'link' && /^stylesheet$/i.test(attrs.rel)) {
					const ref = this.emitFile({
						type: 'asset',
						name: url.replace(/^\.\//, '')
					});
					waiting.push(
						fs.readFile(abs, 'utf-8').then(source => {
							this.setAssetSource(ref, source);
						})
					);
					return `/__ASSET__/${ref}`;
				}
			}
		});

		await Promise.all(waiting);

		this.emitFile({
			type: 'asset',
			fileName: posix.relative(publicDir || cwd, id),
			source: transformed
		});

		return scripts;
	}

	return {
		name: 'html-entries',

		async buildStart(opts) {
			ENTRIES.length = 0;
			const scripts = await Promise.all(Object.values(opts.input).map(handleHtmlEntry.bind(this)));
			opts.input = scripts.flat();
		},

		async generateBundle(_, bundle) {
			for (const id in bundle) {
				const asset = bundle[id];
				// replace asset references with their generated URLs:
				if (asset.type === 'asset' && asset.fileName.match(/\.html$/)) {
					let html = asset.source.toString();
					html = html.replace(/\/__ENTRY__\/(\d+)/g, (str, id) => {
						const name = ENTRIES[id];
						for (const id in bundle) {
							const asset = bundle[id];
							if (asset.type === 'chunk' && asset.facadeModuleId === name) {
								return (publicPath || '') + asset.fileName;
							}
						}
						this.warn(`Could not find generated URL for ${name}`);
						return str;
					});
					html = html.replace(/\/__ASSET__\/(\w+)/g, (str, id) => {
						let filename = this.getFileName(id);
						if (!filename) return str;
						return (publicPath || '') + filename;
					});
					asset.source = html;
				}
			}
		}
	};
}
