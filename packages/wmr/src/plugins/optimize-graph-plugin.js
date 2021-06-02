import { posix } from 'path';
import { hasDebugFlag } from '../lib/output-utils.js';
import { injectHead } from '../lib/transform-html.js';

/** @typedef {import('rollup').OutputBundle} Bundle */
/** @typedef {import('rollup').OutputChunk} Chunk */
/** @typedef {import('rollup').OutputAsset} Asset */
/** @typedef {Asset & { referencedFiles?: string[], importedIds?: string[] }} ExtendedAsset */

let DEBUG;

const DEFAULT_STYLE_LOAD_FN = '$w_s$';
const DEFAULT_STYLE_LOAD_IMPL = `function $w_s$(e,t){typeof document=='undefined'?wmr.ssr.head.elements.add({type:'link',props:{rel:'stylesheet',href:e}}):document.querySelector('link[rel=stylesheet][href="'+e+'"]')||((t=document.createElement("link")).rel="stylesheet",t.href=e,document.head.appendChild(t))}`;

/**
 * Performs graph-based optimizations on generated assets and chunks:
 * - merges CSS assets that are always loaded together
 * - hoists CSS assets that are always loaded by the same parent chunk(s)
 * - merges CSS assets statically imported by entry chunks into entry CSS (<link rel=stylesheet>)
 * - hoists transitive JS and CSS imports, making chunks and styles load in parallel
 * @param {object} [options]
 * @param {string} [options.publicPath]
 * @param {number} [options.cssMinSize] CSS assets smaller than this number of bytes get merged into their parent
 * @returns {import('rollup').Plugin}
 */
export default function optimizeGraphPlugin({ publicPath = '', cssMinSize = 1000 } = {}) {
	DEBUG = hasDebugFlag();
	return {
		name: 'optimize-graph',
		async generateBundle(_, bundle) {
			const graph = new ChunkGraph(bundle, { publicPath });
			mergeAdjacentCss(graph);
			hoistCascadedCss(graph, { cssMinSize });
			await hoistEntryCss(graph);
			hoistTransitiveImports(graph);
		}
	};
}

/**
 * Analysis and manipulation of the chunk+asset graph.
 * @param {Bundle} bundle
 * @param {{ publicPath: string }} options
 */
class ChunkGraph {
	constructor(bundle, { publicPath }) {
		this.bundle = bundle;
		this.assetToChunkMap = constructAssetToChunkMap(bundle);
		this.entries = this.findEntryChunks();
		this.meta = new Map();
		this.publicPath = publicPath;
		// this.entryAssets = this.findEntryAssets();
	}

	/**
	 * Get a mutable object for storing metadata about a chunk/asset.
	 * @param {string} fileName
	 * @returns {{ styleLoadFn?: string }}
	 */
	getMeta(fileName) {
		let meta = this.meta.get(fileName);
		if (!meta) this.meta.set(fileName, (meta = {}));
		return meta;
	}

	/**
	 * Get entry chunks and any non-lazy (statically imported) child chunks.
	 * @returns {Set<string>}
	 */
	findEntryChunks() {
		const entries = new Set();
		for (const fileName in this.bundle) {
			const chunk = this.bundle[fileName];
			if (chunk.type !== 'chunk' || !chunk.isEntry) continue;
			entries.add(fileName);
			for (const f of this.findJsImports(chunk, [], entries)) {
				entries.add(f);
			}
		}
		return entries;
	}

	// /** CSS assets that are not imported by any chunks */
	// findEntryAssets() {
	// 	const entryAssets = new Map();
	// 	for (const fileName in this.bundle) {
	// 		const asset = this.bundle[fileName];
	// 		if (asset.type === 'asset' && isCssFilename(fileName) && !this.assetToChunkMap.has(fileName)) {
	// 			entryAssets.set(fileName, asset);
	// 		}
	// 	}
	// 	return entryAssets;
	// }

	/**
	 * @param {string} chunkFileName
	 * @param {boolean} [staticOnly=false]
	 */
	getParentChunk(chunkFileName, staticOnly) {
		if (this.bundle[chunkFileName].isEntry) return;
		for (const fileName in this.bundle) {
			const chunk = this.bundle[fileName];
			if (chunk.type !== 'chunk') continue;
			if (chunk.imports.includes(chunkFileName)) return chunk;
			if (!staticOnly && chunk.dynamicImports.includes(chunkFileName)) return chunk;
		}
	}

	/**
	 * Find JS and CSS imports within the modules dynamically imported by a chunk.
	 * @param {Chunk} chunk
	 * @param {Iterable<string>} [entries]
	 * @returns {{ css: Map<string, string[]>, js: Map<string, string[]> }}
	 */
	findTransitiveImports(chunk, entries = this.entries) {
		const ownCss = this.findCssImports(chunk);

		const css = new Map();
		const js = new Map();
		for (const dyn of chunk.dynamicImports) {
			const imp = this.findCssImports(this.bundle[dyn]).filter(f => !ownCss.includes(f));
			if (imp.length) {
				css.set(dyn, imp);
			}
			const jsImp = this.findJsImports(this.bundle[dyn], [], new Set(entries));
			if (jsImp.length) {
				js.set(dyn, jsImp);
			}
		}

		return { css, js };
	}

	/**
	 * Get the CSS asset fileNames referenced by a chunk and its statically-imported children.
	 * @param {Chunk} chunk
	 * @param {string[]} [imports]
	 */
	findCssImports(chunk, imports = []) {
		for (const f of chunk.referencedFiles) {
			if (isCssFilename(f) && !imports.includes(f)) imports.push(f);
		}
		for (const child of chunk.imports) {
			const c = this.bundle[child];
			if (c) this.findCssImports(c, imports);
		}
		return imports;
	}

	/**
	 * Get the JS chunk fileNames referenced by a chunk and its statically-imported children.
	 * @param {Chunk} chunk
	 * @param {string[]} [imports]
	 */
	findJsImports(chunk, imports = [], seen = new Set()) {
		for (const child of chunk.imports) {
			if (child === chunk.fileName || seen.has(child)) continue;
			const childChunk = this.bundle[child];
			if (!childChunk || childChunk.isEntry) continue;
			if (!imports.includes(child)) imports.push(child);
			seen.add(child);
			this.findJsImports(childChunk, imports, seen);
		}
		return imports;
	}

	/**
	 * Replace CSS "imports" of the form `style("/url")` within a Chunk.
	 * Return `false` to remove the call.
	 * @param {Chunk} chunk
	 * @param {string|string[]} oldUrl
	 * @param {string|boolean|((url:string,fn:string,quote:string)=>string|boolean|null|undefined)} newUrl
	 */
	replaceCssImport(chunk, oldUrl, newUrl) {
		const publicPath = this.publicPath;
		chunk.code = replaceSimpleFunctionCall(chunk.code, (fn, url, quote) => {
			if (publicPath && url.startsWith(publicPath)) url = url.slice(publicPath.length);
			if (url === oldUrl || (Array.isArray(oldUrl) && oldUrl.includes(url))) {
				let rep = typeof newUrl === 'function' ? newUrl(url, fn, quote) : newUrl;
				if (rep === false) return 'null';
				if (typeof rep === 'string') {
					rep = publicPath ? toImport(publicPath, rep) : JSON.stringify(rep);
				}
				return `${fn}(${rep})`;
			}
		});
	}
}

/**
 * @param {string} publicPath
 * @param {string} filename
 */
function toImport(publicPath, filename) {
	let value = posix.join(publicPath, filename);

	if (/^(https?:)?\/\//.test(publicPath)) {
		const isFull = /^https?:\/\//.test(publicPath);
		const root = isFull ? publicPath : 'https:' + publicPath;
		value = new URL(filename, root).href.substring(isFull ? 0 : 6);
	}

	return JSON.stringify(value);
}

/**
 * Merge together CSS assets that are only used by the same parent chunk
 * @param {ChunkGraph} graph
 */
function mergeAdjacentCss(graph) {
	for (const fileName in graph.bundle) {
		const chunk = graph.bundle[fileName];
		if (chunk.type !== 'chunk') continue;

		const toMerge = unique(
			chunk.referencedFiles.filter(assetFileName => {
				if (!isCssFilename(assetFileName)) return false;
				const chunkInfo = graph.assetToChunkMap.get(assetFileName);
				return chunkInfo && chunkInfo.chunks.length === 1;
			})
		);

		if (toMerge.length < 2) continue;

		if (DEBUG) {
			const p = posix.relative(process.cwd(), chunk.facadeModuleId || chunk.fileName);
			// eslint-disable-next-line no-console
			console.log(`Merging ${toMerge.length} adjacent CSS assets imported by ${p}:\n  ${toMerge.join(', ')}`);
		}

		const base = /** @type {Asset} */ (graph.bundle[toMerge[0]]);
		for (let i = 1; i < toMerge.length; i++) {
			const f = toMerge[i];
			const asset = /** @type {Asset} */ (graph.bundle[f]);
			base.source += '\n' + asset.source;
			chunk.referencedFiles.splice(chunk.referencedFiles.indexOf(f), 1);
			delete graph.bundle[f];
		}

		// Remove all but the first style("url") "import":
		let count = 0;
		graph.replaceCssImport(chunk, toMerge, (url, fn) => {
			graph.getMeta(chunk.fileName).styleLoadFn = fn;
			// replace the first style() with the collapsed bundle ID, omit the rest
			const isFirst = count++ === 0;
			return isFirst && toMerge[0];
		});
	}
}

/**
 * Extract CSS imports from entry modules into the HTML files that reference them.
 * @param {ChunkGraph} graph
 */
async function hoistEntryCss(graph) {
	for (const fileName in graph.bundle) {
		/** @type {ExtendedAsset | Chunk} */
		const asset = graph.bundle[fileName];
		if (asset.type !== 'asset' || !/\.html$/.test(fileName)) continue;

		let cssImport = null;
		if (asset.referencedFiles) {
			// Check if the HTML file has direct CSS imports
			cssImport = asset.referencedFiles.find(f => f.endsWith('.css'));

			// If it's not: Check for entry js css files
			if (!cssImport && asset.importedIds) {
				const jsEntry = asset.importedIds.find(f => f.endsWith('.js'));
				if (jsEntry) {
					const entry = graph.bundle[jsEntry];
					if (entry.isEntry) {
						const cssFile = entry.referencedFiles.find(f => f.endsWith('.css'));

						// Ignore if no entry css:
						if (!cssFile) continue;

						asset.referencedFiles.push(cssFile);

						asset.source = await injectHead(asset.source, {
							tag: 'link',
							attrs: { rel: 'stylesheet', href: '/' + cssFile }
						});
						continue;
					}
				}
			}
		}

		const cssAsset = /** @type {Asset} */ (graph.bundle[cssImport]);
		for (const id of asset.importedIds) {
			const chunk = graph.bundle[id];
			if (chunk.type !== 'chunk') continue;

			for (let i = 0; i < chunk.referencedFiles.length; i++) {
				const f = chunk.referencedFiles[i];
				if (!isCssFilename(f)) continue;
				if (cssAsset) {
					// eslint-disable-next-line no-console
					if (DEBUG) console.log(`Hoisting CSS "${f}" imported by ${id} into parent HTML import "${cssImport}".`);
					// @TODO: this needs to update the hash of the chunk into which CSS got merged.
					cssAsset.source += '\n' + getAssetSource(graph.bundle[f]);
					chunk.referencedFiles[i] = cssImport;
					delete graph.bundle[f];
					graph.replaceCssImport(chunk, f, false);
					const chunkInfo = graph.assetToChunkMap.get(f);
					if (chunkInfo) chunkInfo.mergedInto = cssImport;
					for (const chunkInfo of graph.assetToChunkMap.values()) {
						if (chunkInfo.mergedInto == f) {
							for (const ownerChunk of chunkInfo.chunks) {
								if (ownerChunk === id) continue;
								graph.replaceCssImport(graph.bundle[ownerChunk], f, false);
							}
							chunkInfo.mergedInto = cssImport;
						}
					}
				} else {
					// @TODO: this branch is actually unreachable
					// eslint-disable-next-line no-console
					if (DEBUG) console.log(`Hoisting CSS "${f}" imported by ${id} into parent HTML.`);
					const url = toImport(graph.publicPath, f);
					asset.source = getAssetSource(asset).replace(/<\/head>/, `<link rel="stylesheet" href=${url}></head>`);
				}
			}
		}
	}
}

/**
 * Cascade statically-imported assets (css imported by an imported module) up the graph.
 * @param {ChunkGraph} graph
 */
function hoistCascadedCss(graph, { cssMinSize }) {
	for (const fileName in graph.bundle) {
		const asset = graph.bundle[fileName];
		if (asset.type !== 'asset' || !isCssFilename(asset.fileName)) continue;
		const chunkInfo = graph.assetToChunkMap.get(fileName);

		// ignore external CSS files, those imported by multiple parents, or where their parents are already entries
		if (!chunkInfo) continue;

		// for CSS under 500b, we'll try to avoid loading it async
		const hoistAcrossDynamicImports = cssMinSize && Buffer.byteLength(asset.source) < cssMinSize;

		// @TODO: CSS assets imported by more than one chunk could cause issues here.
		// We should switch to "highest common ancestor" and bail out unless exactly one is found.
		const ownerFileName = chunkInfo.chunks[0];
		const ownerChunk = graph.bundle[ownerFileName];
		let parentChunk;
		parentChunk = ownerChunk;
		while ((parentChunk = graph.getParentChunk(parentChunk.fileName, !hoistAcrossDynamicImports))) {
			const isEntry = parentChunk.isEntry || parentChunk.isDynamicEntry;
			if (!isEntry) continue;

			const parentFileName = parentChunk.fileName;

			const ownCss = parentChunk.referencedFiles.find(f => {
				const info = isCssFilename(f) && graph.assetToChunkMap.get(f);
				return info && info.chunks.length === 1;
			});

			if (ownCss) {
				// TODO: here be dragons
				// eslint-disable-next-line no-console
				if (DEBUG) console.log(`Merging ${fileName} into ${ownCss} (${ownerFileName} → ${parentFileName})`);
				const parentAsset = /** @type {Asset} */ (graph.bundle[ownCss]);
				parentAsset.source += '\n' + asset.source;
				graph.replaceCssImport(ownerChunk, fileName, ownCss);
				delete graph.bundle[fileName];
				chunkInfo.mergedInto = ownCss;
				// chunkInfo.chunks = [parentFileName];
				chunkInfo.chunks.unshift(parentFileName);
				const i = ownerChunk.referencedFiles.indexOf(fileName);
				if (i !== -1) ownerChunk.referencedFiles.splice(i, 1);
			} else {
				// eslint-disable-next-line no-console
				if (DEBUG) console.log(`Hoisting ${fileName} from ${ownerFileName} into ${parentFileName}`);
				const meta = graph.getMeta(parentFileName);
				// inject the stylesheet loader: (and register it)
				if (!meta.styleLoadFn) {
					// if (DEBUG) console.log(`Injecting style loader into ${parentFileName}`);
					meta.styleLoadFn = DEFAULT_STYLE_LOAD_FN;
					parentChunk.code += '\n' + DEFAULT_STYLE_LOAD_IMPL;
				}

				const url = toImport(graph.publicPath, fileName);
				parentChunk.code += `\n${meta.styleLoadFn}(${url});`;
			}
			break;
		}
	}
}

/**
 * Visit every dynamic import(), and inject hoisted JS + CSS imports from it at the callsite.
 * Turns this:
 *   import('/foo.js')
 * Into this:
 *   (import('/util.js'),style('/foo.module.css'),import('/foo.js'))
 * @param {ChunkGraph} graph
 */
function hoistTransitiveImports(graph) {
	for (const fileName in graph.bundle) {
		const chunk = graph.bundle[fileName];
		if (chunk.type !== 'chunk') continue;

		const deps = graph.findTransitiveImports(chunk);
		if (deps.css.size === 0 && deps.js.size === 0) continue;

		let appendCode = '';
		chunk.code = chunk.code.replace(/import\((['"`])(.*?)\1\)/gi, (s, quote, url) => {
			const spec = url.startsWith('./') ? posix.join(posix.dirname(fileName), url) : url;
			if (!deps.css.has(spec) && !deps.js.has(spec)) return s;

			const imp = `import(${quote}${url}${quote})`;
			const preloads = [];

			const css = deps.css.get(spec);
			if (css && css.length) {
				const meta = graph.getMeta(fileName);
				// inject the stylesheet loader: (and register it)
				if (!meta.styleLoadFn) {
					// if (DEBUG) console.log(`Injecting style loader into ${url}`);
					meta.styleLoadFn = DEFAULT_STYLE_LOAD_FN;
					appendCode += '\n' + DEFAULT_STYLE_LOAD_IMPL;
				}
				// eslint-disable-next-line no-console
				if (DEBUG) console.log(`Preloading CSS for import(${spec}): ${css}`);
				preloads.push(...css.map(f => `${meta.styleLoadFn}(${toImport(graph.publicPath, f)})`));
			}

			const js = deps.js.get(spec);
			if (js && js.length) {
				// eslint-disable-next-line no-console
				if (DEBUG) console.log(`Preloading JS for import(${spec}): ${js}`);
				preloads.push(
					...js.map(f => {
						if (/^(https?:)?\/\//.test(graph.publicPath)) {
							return `import(${toImport(graph.publicPath, f)})`;
						}
						let rel = posix.relative(posix.dirname('/' + fileName), posix.join(graph.publicPath, f));
						if (!rel.startsWith('.')) rel = './' + rel;
						return `import(${JSON.stringify(rel)})`;
					})
				);
			}

			if (!preloads.length) return s;

			// Option 1: preload CSS, but don't wait for it:
			return `(${preloads.join(',')},${imp})`;
			// Option 2: wait for CSS before resolving:
			// return `Promise.all([${imp},${preloads.join(',')}]).then(r=>r[0])`;
		});

		// inject style loader (once) if required:
		if (appendCode) chunk.code += appendCode;
	}
}

/**
 * Generate a mapping of assets to metadata about the chunks that reference them.
 * @param {Bundle} bundle
 * @return {Map<string, { isEntry: boolean, isDynamicEntry: boolean, isImplicitEntry: boolean, mergedInto?: string, chunks: string[] }>}
 */
function constructAssetToChunkMap(bundle) {
	const assetToChunkMap = new Map();
	for (const fileName in bundle) {
		const chunk = bundle[fileName];
		if (chunk.type !== 'chunk') continue;

		for (const fileId of chunk.referencedFiles) {
			if (!isCssFilename(fileId)) continue;
			let map = assetToChunkMap.get(fileId);
			if (!map) {
				map = {
					isEntry: false,
					isDynamicEntry: false,
					isImplicitEntry: false,
					mergedInto: undefined,
					chunks: []
				};
				assetToChunkMap.set(fileId, map);
			}
			if (chunk.isEntry) {
				map.isEntry = true;
				if (!map.entryChunk) map.entryChunk = fileName;
			}
			if (chunk.isDynamicEntry) map.isDynamicEntry = true;
			if (chunk.isImplicitEntry) map.isImplicitEntry = true;
			const currentIndex = map.chunks.indexOf(fileName);
			if (chunk.implicitlyLoadedBefore && chunk.implicitlyLoadedBefore.length) {
				let index = -1;
				for (const id of chunk.implicitlyLoadedBefore) {
					index = Math.max(index, map.chunks.indexOf(id));
				}
				if (index !== -1) {
					if (index !== currentIndex) {
						map.chunks.splice(currentIndex, 1);
						map.chunks.splice(index, 0, fileName);
					}
					continue;
				}
			}
			if (currentIndex === -1) {
				map.chunks.push(fileName);
			}
		}
	}
	return assetToChunkMap;
}

/**
 * Replace function calls of the form `$fn("$url")` with a value returned by a function.
 * This is brittle. It should only be used for generated code and must account for it having been minified.
 * @param {string} code
 * @param {(fn: string, url: string, quote: string) => string | null | undefined} replacer Return replacement code, or `null`/`undefined` to preserve the matched call.
 */
function replaceSimpleFunctionCall(code, replacer) {
	return code.replace(/(?<![.\w])([a-z$_][\w$]*)\((['"`])((?:(?!\2)[^\\]|\\.)*?)\2\)/gi, (s, fn, quote, url) => {
		const ret = replacer(fn, url, quote);
		return ret == null ? s : ret;
	});
}

const isCssFilename = fileName => /\.(?:css|s[ac]ss)$/.test(fileName);

function getAssetSource(asset) {
	let code = asset.source;
	if (typeof code !== 'string') {
		return Buffer.from(code.buffer).toString('utf-8');
	}
	return code;
}

/** @param {Array<string>} arr @returns {Array<string>} */
const unique = arr => Array.from(new Set(arr));
