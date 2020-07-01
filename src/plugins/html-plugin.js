import { promises as fs } from 'fs';
import { posix } from 'path';
import posthtml from 'posthtml';
import posthtmlUrls from 'posthtml-urls';
// import { parse as scanHtml } from '../lib/get-scripts.js';

const isLocalFile = src => src && !/^([a-z]+:)\/\//i.test(src);

/**
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
			// const fakePath = posix.dirname(id) + '/___.js';
			// const imports = [];

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

			// scanHtml(html, (name, attribs) => {
			// 	switch (name) {
			// 		case 'script': {
			// 			if (attribs.type === 'module' && isLocalFile(attribs.src)) {
			// 				// const referenceId = this.emitFile({
			// 				// 	type: 'chunk',
			// 				// 	id: attribs.src,
			// 				// 	importer: id
			// 				// });
			// 				// console.log('script: ', referenceId, attribs.src);
			// 				imports.push(attribs.src);
			// 				// scripts.push('./' + posix.relative('.', posix.join(basePath, attribs.src)));
			// 			}
			// 			break;
			// 		}
			// 		case 'link': {
			// 			if (attribs.rel === 'stylesheet' && isLocalFile(attribs.href)) {
			// 				// const referenceId = this.emitFile({
			// 				// 	type: 'chunk',
			// 				// 	id: attribs.href,
			// 				// 	importer: id
			// 				// });
			// 				// console.log('style: ', referenceId, attribs.href);
			// 				// this.emitFile({
			// 				// 	type: 'asset',
			// 				// 	name: attribs.src
			// 				// });
			// 				imports.push(attribs.href);
			// 				// styles.push('./' + posix.relative('.', posix.join(basePath, attribs.href)));
			// 			}
			// 			break;
			// 		}
			// 	}
			// });

			// for (let p of imports) {
			// 	const orig = p;
			// 	let abs = p;
			// 	if (p[0] === '/') {
			// 		p = p.substring(1);
			// 		abs = posix.join(publicDir || cwd, p);
			// 	} else {
			// 		if (!/^\.?\.\//.test(p)) p = './' + p;
			// 		// abs = (await this.resolve(p, fakePath, { skipSelf: true })).id;
			// 		abs = posix.resolve(posix.dirname(id), p);
			// 		console.log(p, fakePath, abs);
			// 	}
			// 	if (/\.css$/.test(p)) {
			// 		const ref = this.emitFile({
			// 			type: 'asset',
			// 			name: p
			// 		});
			// 		finalHtml = finalHtml.replace(orig, `/__ASSET__/${ref}`);
			// 		waiting.push(
			// 			fs.readFile(abs, 'utf-8').then(source => {
			// 				this.setAssetSource(ref, source);
			// 			})
			// 		);
			// 	} else {
			// 		const ref = this.emitFile({
			// 			type: 'chunk',
			// 			id: abs,
			// 			implicitlyLoadedAfterOneOf: previousScriptId && [previousScriptId]
			// 			// id: posix.relative(fakePath, abs),
			// 		});
			// 		previousScriptId = abs;
			// 		finalHtml = finalHtml.replace(orig, `/__ASSET__/${ref}`);
			// 	}
			// }

			await Promise.all(waiting);

			// console.log('html filename: ', posix.relative(publicDir || cwd, id));
			this.emitFile({
				type: 'asset',
				fileName: posix.relative(publicDir || cwd, id),
				source: transformed.html
			});

			return 'console.log(1)';
		},
		// augmentChunkHash(chunk) {
		// 	console.log(chunk.name);
		// 	if (chunk.isDynamicEntry) {
		// 		// const m = chunk.fileName.match(/^chunks\/index\./);
		// 		const m = chunk.name === 'index';
		// 		if (m && chunk.facadeModuleId) {
		// 			const name = posix.relative(publicDir || cwd, posix.dirname(chunk.facadeModuleId)).replace(/\//g, '__');
		// 			console.log(chunk.fileName, chunk.name, chunk.facadeModuleId, name);
		// 			return name;
		// 			// chunk.fileName = chunk.fileName.replace('/index.', `/${name}.`);
		// 		}
		// 	}
		// },
		async generateBundle(_, bundle) {
			for (const id in bundle) {
				const asset = bundle[id];
				// if (asset.type === 'chunk' && (asset.isEntry || asset.isDynamicEntry)) {
				// 	const m = asset.fileName.match(/^chunks\/index\./);
				// 	if (m && asset.facadeModuleId) {
				// 		console.log(asset.fileName, asset.name, asset.facadeModuleId);
				// 		const name = posix.relative(publicDir || cwd, posix.dirname(asset.facadeModuleId)).replace(/\//g, '__');
				// 		asset.fileName = asset.fileName.replace('/index.', `/${name}.`);
				// 	}
				// }
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
