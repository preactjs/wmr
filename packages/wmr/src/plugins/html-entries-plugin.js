import { promises as fs } from 'fs';
import { resolve, join, dirname, relative, sep, posix } from 'path';
import { transformHtml } from '../lib/transform-html.js';
import { yellow, bgYellow, bgRed, dim, bold, white, black, magenta } from 'kolorist';
import { codeFrame } from '../lib/output-utils.js';

/** @typedef {import('rollup').OutputAsset & { referencedFiles: string[], importedIds: string[] }} ExtendedAsset */

/** @param {string} src */
const isLocalFile = src => src && !/^([a-z]+:)?\/\//i.test(src);

/** @param {string} p */
const toSystemPath = p => p.split(posix.sep).join(sep);

/**
 * This Rollup plugin handles resolving HTML entrypoints.
 *
 * It works by intercepting HTML files in `options.input`,
 * instead passing the HTML through emitFile() as an asset.
 *
 * It also finds scripts and styles in the HTML and passes them to Rollup.
 * Notably, <scripts> become *user-defined entries*, so they correctly use `output.entryFileNames`.
 *
 * @param {object} options
 * @param {string} [options.cwd]
 * @param {string} [options.publicDir]
 * @param {string} [options.publicPath] Prepend to generated filenames
 * @returns {import('rollup').Plugin}
 */
export default function htmlEntriesPlugin({ cwd, publicDir, publicPath } = {}) {
	const root = publicDir || cwd || '.';
	const ENTRIES = [];
	const META = new Map();

	/** @this {import('rollup').PluginContext} */
	async function handleHtmlEntry(id) {
		if (!/\.html$/.test(id)) return id;

		this.addWatchFile(id);
		const resolved = await this.resolve(id, undefined, { skipSelf: true });
		if (!resolved) return;
		id = resolved.id;

		const entryId = relative(root, id);
		const html = await fs.readFile(id, 'utf-8');
		const waiting = [];
		const scripts = [];
		const all = [];

		const transformed = await transformHtml(html, {
			transformUrl: (url, attr, tag, { attrs }) => {
				const origUrl = url;
				if (!isLocalFile(url)) return null;

				let abs = url;
				if (url[0] === '/') {
					url = './' + url.substring(1);
					abs = join(root, toSystemPath(url));
				} else {
					if (!/^\.?\.\//.test(url)) url = './' + url;
					abs = resolve(dirname(id), toSystemPath(url));
				}

				if (tag === 'script') {
					if (attrs && attrs.nomodule) return null;

					if (!attrs || !/^\s*module\s*$/i.test(attrs.type || '')) {
						let match, frame;
						const reg = /<script(?:\s[^>]*?)?\ssrc=(['"]?)([^'">]*?)\1(?:\s[^>]*?)?\s*>/;
						while ((match = reg.exec(html))) {
							if (match[2] === origUrl) {
								frame = codeFrame(html, match.index);
								break;
							}
						}
						this.warn(
							'\n' +
								bgYellow(black(bold('WARN'))) +
								yellow(` <script src="${url}"> is missing type="module".\n`) +
								white(`${dim('>')} Only module scripts are handled by WMR.\n`) +
								white(dim('> ' + yellow(entryId) + ': ')) +
								(frame ? white(frame) : '')
						);
						return null;
					}

					const id = ENTRIES.push(abs) - 1;
					scripts.push(abs);
					all.push(abs);
					return `/__ENTRY__/${id}`;
				}

				if (tag === 'link' && attrs && attrs.rel && /^stylesheet$/i.test(attrs.rel)) {
					const ref = this.emitFile({
						type: 'asset',
						name: url.replace(/^\.\//, '')
					});
					all.push(ref);
					waiting.push(
						fs.readFile(abs, 'utf-8').then(source => {
							this.setAssetSource(ref, source);
						})
					);
					return `/__ASSET__/${ref}`;
				}

				return null;
			}
		});

		await Promise.all(waiting);

		this.emitFile({
			type: 'asset',
			fileName: entryId,
			source: transformed
		});

		META.set(entryId, { assets: all });

		return scripts;
	}

	return {
		name: 'html-entries',

		async buildStart(opts) {
			META.clear();
			ENTRIES.length = 0;
			const entries = Object.values(opts.input);
			const scripts = await Promise.all(entries.map(handleHtmlEntry.bind(this)));
			opts.input = scripts.flat();
			if (opts.input.length === 0) {
				const htmlEntries = entries.filter(id => /\.html$/.test(id));

				let desc = htmlEntries.slice(0, 3).join(', ');
				if (htmlEntries.length > 3) desc += ` (+${htmlEntries.length - 3} more)`;
				this.error(
					`\n${bgRed(white(bold(`ERROR`)))} No modules found:` +
						`\n> ${white(`No module scripts were found in ${desc}.`)}` +
						`\n> ${white(`Did you forget ${dim('<script')} ${magenta('type="module"')} ${dim('src="..">')} ?`)}\n`
				);
			}
		},

		async generateBundle(_, bundle) {
			for (const id in bundle) {
				const thisAsset = bundle[id];
				if (thisAsset.type !== 'asset' || !/\.html$/.test(thisAsset.fileName)) continue;

				/** @type {ExtendedAsset} */
				const htmlAsset = Object.assign(thisAsset, {
					importedIds: [],
					referencedFiles: []
				});

				let html = htmlAsset.source;
				if (typeof html !== 'string') html = Buffer.from(html.buffer).toString('utf-8');

				// Replace chunk references with their generated URLs:
				html = html.replace(/\/__ENTRY__\/(\d+)/g, (str, id) => {
					const name = ENTRIES[id];
					for (const id in bundle) {
						const asset = bundle[id];
						if (asset.type === 'chunk' && asset.facadeModuleId === name) {
							const fileName = asset.fileName;
							if (!htmlAsset.importedIds.includes(fileName)) {
								htmlAsset.importedIds.push(fileName);
							}
							return (publicPath || '') + fileName;
						}
					}
					this.warn(`Could not find generated URL for ${name}`);
					return str;
				});

				// Replace asset references with their generated URLs:
				html = html.replace(/\/__ASSET__\/(\w+)/g, (str, id) => {
					let filename = this.getFileName(id);
					if (!filename) return str;
					if (!htmlAsset.referencedFiles.includes(filename)) {
						htmlAsset.referencedFiles.push(filename);
					}
					return (publicPath || '') + filename;
				});

				htmlAsset.source = html;
			}
		}
	};
}
