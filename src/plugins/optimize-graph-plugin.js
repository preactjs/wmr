import { posix } from 'path';

/** @typedef {import('rollup').OutputBundle} Bundle */
/** @typedef {import('rollup').OutputChunk} Chunk */
/** @typedef {import('rollup').OutputAsset} Asset */
/** @typedef {Asset & { referencedFiles?: string[], importedIds?: string[] }} ExtendedAsset */

/**
 * Performs graph-based optimizations on generated assets and chunks:
 * - merges CSS assets that are always loaded together
 * - hoists CSS assets that are always loaded by the same parent chunk(s)
 * - merges CSS assets statically imported by entry chunks into entry CSS (<link rel=stylesheet>)
 * - hoists transitive JS and CSS imports, making chunks and styles load in parallel
 * @param {object} [options]
 * @param {string} [options.publicPath]
 * @returns {import('rollup').Plugin}
 */
export default function optimizeGraphPlugin({ publicPath = '' } = {}) {
	return {
		name: 'optimize-graph',
		async generateBundle(_, bundle) {
			const graph = new ChunkGraph(bundle, { publicPath });
			mergeAdjacentCss(graph);
			hoistEntryCss(graph);
			hoistCascadedCss(graph);
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
					if (publicPath) rep = posix.join(publicPath, rep);
					rep = JSON.stringify(rep);
				}
				return `${fn}(${rep})`;
			}
		});
	}
}

/**
 * Merge together CSS assets that are only used by the same parent chunk
 * @param {ChunkGraph} graph
 */
function mergeAdjacentCss(graph) {
	for (const fileName in graph.bundle) {
		const chunk = graph.bundle[fileName];
		if (chunk.type !== 'chunk') continue;

		const toMerge = chunk.referencedFiles.filter(assetFileName => {
			if (!isCssFilename(assetFileName)) return false;
			const chunkInfo = graph.assetToChunkMap.get(assetFileName);
			return chunkInfo && chunkInfo.chunks.length === 1;
		});

		if (toMerge.length < 2) continue;

		const p = posix.relative(process.cwd(), chunk.facadeModuleId || chunk.fileName);
		console.log(`Merging ${toMerge.length} adjacent CSS children of parent ${p}:\n  ${toMerge.join(', ')}`);
		const base = /** @type {Asset} */ (graph.bundle[toMerge[0]]);
		for (let i = 1; i < toMerge.length; i++) {
			const f = toMerge[i];
			const asset = /** @type {Asset} */ (graph.bundle[f]);
			base.source += '\n' + asset.source;
			chunk.referencedFiles.splice(chunk.referencedFiles.indexOf(f), 1);
			delete graph.bundle[f];
		}

		// remove all but the first style("url") "import"
		let count = 0;
		graph.replaceCssImport(chunk, toMerge, (url, fn) => {
			// styleLoadFns.set(chunk.fileName, fn);
			graph.getMeta(chunk.fileName).styleLoadFn = fn;
			// replace the first style() with the collapsed bundle ID, omit the rest
			return count++ === 0 && toMerge[0];
		});
	}
}

/**
 * Extract CSS imports from entry modules into the HTML files that reference them.
 * @param {ChunkGraph} graph
 */
function hoistEntryCss(graph) {
	for (const fileName in graph.bundle) {
		/** @type {ExtendedAsset | Chunk} */
		const asset = graph.bundle[fileName];
		if (asset.type !== 'asset' || !/\.html$/.test(fileName)) continue;

		const cssImport = asset.referencedFiles && asset.referencedFiles.find(f => f.endsWith('.css'));
		if (!cssImport || !asset.importedIds) continue;

		const cssAsset = /** @type {Asset} */ (graph.bundle[cssImport]);
		for (const id of asset.importedIds) {
			const chunk = graph.bundle[id];
			if (chunk.type !== 'chunk') continue;

			for (let i = 0; i < chunk.referencedFiles.length; i++) {
				const f = chunk.referencedFiles[i];
				if (!isCssFilename(f)) continue;
				if (cssAsset) {
					console.log(`Hoisting CSS "${f}" imported by ${id} into parent HTML's CSS import "${cssImport}".`);
					cssAsset.source += '\n' + getAssetSource(graph.bundle[f]);
					chunk.referencedFiles[i] = cssImport;
					delete graph.bundle[f];
					graph.replaceCssImport(chunk, f, false);
				} else {
					console.log(`Hoisting CSS "${f}" imported by ${id} into parent HTML.`);
					const url = JSON.stringify(posix.join(graph.publicPath, f));
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
function hoistCascadedCss(graph) {
	for (const fileName in graph.bundle) {
		const asset = graph.bundle[fileName];
		if (asset.type !== 'asset' || !isCssFilename(asset.fileName)) continue;
		const chunkInfo = graph.assetToChunkMap.get(fileName);

		// ignore external CSS files, those imported by multiple parents, or where their parents are already entries
		// if (!chunkInfo || chunkInfo.chunks.length !== 1 || chunkInfo.isEntry || chunkInfo.isDynamicEntry) continue;
		if (!chunkInfo) continue;

		const ownerChunk = graph.bundle[chunkInfo.chunks[0]];
		let parentChunk;
		parentChunk = ownerChunk;
		while ((parentChunk = graph.getParentChunk(parentChunk.fileName, true))) {
			const isEntry = parentChunk.isEntry || parentChunk.isDynamicEntry;
			if (!isEntry) continue;

			const ownCss = parentChunk.referencedFiles.find(f => {
				const info = isCssFilename(f) && graph.assetToChunkMap.get(f);
				return info && info.chunks.length === 1;
			});

			if (ownCss) {
				// TODO: here be dragons
				const parentAsset = /** @type {Asset} */ (graph.bundle[ownCss]);
				parentAsset.source += '\n' + asset.source;
				delete graph.bundle[fileName];
				console.log(
					`Moved ${fileName} from ${chunkInfo.chunks[0]} to ${parentChunk.fileName} (merged into ${parentAsset.fileName})`
				);
				graph.replaceCssImport(ownerChunk, fileName, ownCss);
				chunkInfo.chunks = [parentChunk.fileName];
			} else {
				// const fn = styleLoadFns.get(parentChunk.fileName);
				const fn = graph.getMeta(parentChunk.fileName).styleLoadFn;
				const url = JSON.stringify(posix.join(graph.publicPath, fileName));
				if (fn) {
					console.log(`Hoisted ${fileName} import from ${chunkInfo.chunks[0]} into ${parentChunk.fileName}`);
					parentChunk.code += `\n${fn}(${url});`;
				} else {
					console.log(`Preloading ${fileName} import from ${chunkInfo.chunks[0]} in ${parentChunk.fileName}`);
					parentChunk.code += `\ndocument.querySelector('link[rel="stylesheet"][href=${url}]')||document.head.appendChild(Object.assign(document.createElement('link'),{rel:'stylesheet',href:${url}}));`;
				}
			}
			break;
		}
	}
}

/**
 * Visit every dynamic import(), and inject hoisted JS + CSS imports from it at the callsite.
 * Turns this:
 *   import('./foo.js')
 * Into this:
 *   (import('/util.js'),style('/foo.module.css'),import('./foo.js'))
 * @param {ChunkGraph} graph
 */
function hoistTransitiveImports(graph) {
	for (const fileName in graph.bundle) {
		const chunk = graph.bundle[fileName];
		if (chunk.type !== 'chunk') continue;

		const deps = graph.findTransitiveImports(chunk);
		if (deps.css.size === 0 && deps.js.size === 0) continue;

		chunk.code = chunk.code.replace(/import\((['"`])(.*?)\1\)/gi, (s, quote, url) => {
			const spec = url.startsWith('./') ? posix.join(posix.dirname(fileName), url) : url;
			if (!deps.css.has(spec) && !deps.js.has(spec)) return s;

			// const fn = styleLoadFns.get(fileName);
			const fn = graph.getMeta(fileName).styleLoadFn;
			if (!fn) {
				console.log('no style loader func defined for ', url);
				return s;
			}

			const imp = `import(${quote}${url}${quote})`;
			const preloads = [];

			const css = deps.css.get(spec);
			if (css) {
				preloads.push(...css.map(f => `${fn}(${JSON.stringify(posix.join(graph.publicPath, f))})`));
				console.log(`Preloading CSS for import(${spec}): ${css}`);
			}

			const js = deps.js.get(spec);
			if (js) {
				preloads.push(
					...js.map(f => {
						let rel = posix.relative(posix.dirname('/' + fileName), posix.join(graph.publicPath, f));
						if (!rel.startsWith('.')) rel = './' + rel;
						return `import(${JSON.stringify(rel)})`;
						// return `import(${JSON.stringify(posix.join(publicPath, f))})`;
					})
				);
				console.log(`Preloading JS for import(${spec}): ${js}`);
			}

			const preload = preloads.join(',');
			// console.log(`Preloading CSS for import(${spec}): ${cssImports.get(spec)} ${transitiveDeps.get(spec)}`);
			// version 1: wait for CSS before resolving
			// return `Promise.all([${imp},${preload}]).then(r=>r[0])`;
			// version 2: preload CSS, but don't wait for it
			return `(${preload},${imp})`;
		});
	}
}

/**
 * Generate a mapping of assets to metadata about the chunks that reference them.
 * @param {Bundle} bundle
 * @return {Map<string, { isEntry: boolean, isDynamicEntry: boolean, isImplicitEntry: boolean, chunks: string[] }>}
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

// Utilities

const isCssFilename = fileName => /\.(?:css|s[ac]ss)$/.test(fileName);

/**
 * Replace function calls of the form `$fn("$url")` with a value returned by a function.
 * @type {(code: string, replacer: (fn: string, url: string, quote: string) => string | null | undefined) => string}
 */
function replaceSimpleFunctionCall(code, replacer) {
	return code.replace(/([a-z$_][a-z0-9$_]*)\((['"`])(.*?)\2\)/gi, (s, fn, quote, url) => {
		const ret = replacer(fn, url, quote);
		return ret == null ? s : ret;
	});
}

/**
 * @param {any} asset
 * @return {string}
 */
function getAssetSource(asset) {
	let code = asset.source;
	if (typeof code !== 'string') {
		return Buffer.from(code.buffer).toString('utf-8');
	}
	return code;
}

// function getEntryChunks(chunkFileName, ofFiles = [], entries = [], seen = new Set()) {
// 	for (const fileName in bundle) {
// 		const chunk = bundle[fileName];
// 		if (chunk.type !== 'chunk' || seen.has(fileName)) continue;
// 		if (chunk.dynamicImports.includes(chunkFileName) || chunk.imports.includes(chunkFileName)) {
// 			if (chunk.isEntry || chunk.isDynamicEntry) {
// 				if (!ofFiles.includes(chunkFileName)) ofFiles.push(chunkFileName);
// 				entries.push(chunk);
// 			} else {
// 				getEntryChunks(chunk.fileName, ofFiles, entries, seen);
// 			}
// 		}
// 	}
// 	return entries;
// }
// const parentChunks = new Map();
// function addParent(chunk, parent) {
// 	const pc = parentChunks.get(chunk);
// 	if (pc) pc.add(parent);
// 	else parentChunks.set(chunk, new Set([parent]));
// }
// for (const fileName in bundle) {
// 	const chunk = bundle[fileName];
// 	if (chunk.type !== 'chunk') continue;
// 	for (const f of chunk.referencedFiles) addParent(f, fileName);
// 	for (const f of chunk.imports) addParent(f, fileName);
// 	for (const f of chunk.dynamicImports) addParent(f, fileName);
// }

// function getEntryChunks(chunkFileName, entries = [], seen = new Set()) {
// 	for (const fileName in bundle) {
// 		const chunk = bundle[fileName];
// 		if (chunk.type !== 'chunk' || seen.has(fileName)) continue;
// 		if (
// 			(chunk.dynamicImports.includes(chunkFileName) && chunk.dynamicImports.length === 1) ||
// 			chunk.imports.includes(chunkFileName)
// 		) {
// 			if (chunk.isEntry || chunk.isDynamicEntry) {
// 				if (!entries.includes(fileName)) entries.push(fileName);
// 			} else {
// 				getEntryChunks(chunk.fileName, entries, seen);
// 			}
// 		}
// 	}
// 	return entries;
// }
