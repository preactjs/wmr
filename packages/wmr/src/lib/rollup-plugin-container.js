import { resolve, relative, dirname, sep, posix, isAbsolute } from 'path';
import { createHash } from 'crypto';
import { promises as fs } from 'fs';
import * as acorn from 'acorn';
import * as kl from 'kolorist';
import { debug, formatResolved, formatPath, hasDebugFlag } from './output-utils.js';
import { mergeSourceMaps } from './sourcemap.js';

// Rollup respects "module", Node 14 doesn't.
const cjsDefault = m => ('default' in m ? m.default : m);
/** @type acorn */
const { Parser } = cjsDefault(acorn);

const toPosixPath = path => path.split(sep).join(posix.sep);

/** Fast splice(x,1) when order doesn't matter (h/t Rich)
 *  @param {Array} array @param {number} index
 */
function popIndex(array, index) {
	const tail = array.pop();
	if (index !== array.length) array[index] = tail;
}

/** Get a unique key for a (id,importer) resolve pair
 *  @param {string} id @param {string} [importer]
 */
function identifierPair(id, importer) {
	if (importer) return id + '\n' + importer;
	return id;
}

/** @typedef {import('rollup').Plugin} Plugin */

/**
 * @typedef PluginContainerOptions
 * @property {import('rollup').OutputOptions} [output]
 * @property {string} [cwd]
 * @property {Map<string, { info: import('rollup').ModuleInfo }>} [modules]
 * @property {(name: string, source: string | Uint8Array) => void} [writeFile]
 */

/**
 * @typedef PluginContainerContext
 * @type {(import('rollup').PluginContext | {}) & { options: PluginContainerOptions, outputOptions: import('rollup').OutputOptions }}
 */

/**
 * @param {Plugin[]} plugins
 * @param {import('rollup').InputOptions & PluginContainerOptions} [opts]
 */
export function createPluginContainer(plugins, opts = {}) {
	if (!Array.isArray(plugins)) plugins = [plugins];

	const MODULES = opts.modules || new Map();

	function generateFilename({ type, name, fileName, source }) {
		const posixName = toPosixPath(name);
		if (!fileName) {
			fileName =
				(type === 'entry' && ctx.outputOptions.file) || ctx.outputOptions[type + 'FileNames'] || '[name][extname]';
			fileName = fileName.replace('[hash]', () => createHash('md5').update(source).digest('hex').substring(0, 5));
			fileName = fileName.replace('[extname]', posix.extname(posixName));
			fileName = fileName.replace('[ext]', posix.extname(posixName).substring(1));
			fileName = fileName.replace('[name]', posix.basename(posixName).replace(/\.[a-z0-9]+$/g, ''));
		}
		const result = resolve(opts.cwd || '.', ctx.outputOptions.dir || '.', fileName);
		// console.log('filename for ' + name + ': ', result);
		return result;
	}

	// counter for generating unique emitted asset IDs
	let ids = 0;
	let files = new Map();

	let watchFiles = new Set();

	let plugin;
	let parser = Parser;

	/** @type {PluginContainerContext} */
	const ctx = {
		meta: {
			rollupVersion: '2.8.0',
			watchMode: true
		},
		options: { ...opts },
		outputOptions: {
			dir: opts.output && opts.output.dir,
			file: opts.output && opts.output.file,
			entryFileNames: opts.output && opts.output.entryFileNames,
			chunkFileNames: opts.output && opts.output.chunkFileNames,
			assetFileNames: opts.output && opts.output.assetFileNames
		},
		parse(code, opts) {
			return parser.parse(code, {
				sourceType: 'module',
				ecmaVersion: 2020,
				locations: true,
				onComment: [],
				...opts
			});
		},
		async resolve(id, importer, { skipSelf = false } = { skipSelf: false }) {
			const skip = [];
			if (skipSelf && plugin) skip.push(plugin);
			let out = await container.resolveId(id, importer, skip);
			if (typeof out === 'string') out = { id: out };
			if (!out || !out.id) out = { id };
			if (out.id.match(/^\.\.?[/\\]/)) {
				out.id = resolve(opts.cwd || '.', importer ? dirname(importer) : '.', out.id);
			}
			return out || false;
		},
		getModuleInfo(id) {
			let mod = MODULES.get(id);
			if (mod) return mod.info;
			mod = {
				/** @type {import('rollup').ModuleInfo} */
				// @ts-ignore-next
				info: {}
			};
			MODULES.set(id, mod);
			return mod.info;
		},
		emitFile(assetOrFile) {
			const { type, name, fileName } = assetOrFile;
			const source = assetOrFile.type === 'asset' && assetOrFile.source;
			const id = String(++ids);
			const filename = fileName || generateFilename({ type, name, source, fileName });
			files.set(id, { id, name, filename });
			if (source) {
				if (type === 'chunk') {
					throw Error(`emitFile({ type:"chunk" }) cannot include a source`);
				}
				if (opts.writeFile) opts.writeFile(filename, source);
				else fs.writeFile(filename, source);
			}
			return id;
		},
		setAssetSource(assetId, source) {
			const asset = files.get(String(assetId));
			if (asset.type === 'chunk') {
				throw Error(`setAssetSource() called on a chunk`);
			}
			asset.source = source;
			if (opts.writeFile) opts.writeFile(asset.filename, source);
			else fs.writeFile(asset.filename, source);
		},
		getFileName(referenceId) {
			return container.resolveFileUrl({ referenceId });
		},
		addWatchFile(id) {
			watchFiles.add(id);
		},
		warn(...args) {
			// eslint-disable-next-line no-console
			console.log(`[${plugin.name}]`, ...args);
		}
	};

	const logResolve = debug('wmr:resolve');
	const logTransform = debug('wmr:transform');
	const logLoad = debug('wmr:load');

	const container = {
		ctx,

		/**
		 * @todo this is now an async series hook in rollup, need to find a way to allow for that here.
		 * @param {import('rollup').InputOptions} options
		 * @returns {import('rollup').InputOptions}
		 */
		options(options) {
			for (plugin of plugins) {
				if (!plugin.options) continue;
				options = plugin.options.call(ctx, options) || options;
			}
			if (options.acornInjectPlugins) {
				// @ts-ignore-next
				parser = Parser.extend(...options.acornInjectPlugins);
			}
			return options;
		},

		/** @param {object} options */
		async buildStart() {
			await Promise.all(
				plugins.map(plugin => {
					if (plugin.buildStart) {
						plugin.buildStart.call(ctx, container.options);
					}
				})
			);
		},

		/**
		 * @param {string} id
		 * @returns {string[]} WMR specific
		 */
		watchChange(id) {
			const pending = [];
			if (watchFiles.has(id)) {
				for (plugin of plugins) {
					if (!plugin.watchChange) continue;
					// Note return value is WMR specific
					const res = plugin.watchChange.call(ctx, id);
					if (Array.isArray(res)) {
						pending.push(...res);
					}
				}
			}
			return pending;
		},

		/** @param {string} property */
		resolveImportMeta(property) {
			for (plugin of plugins) {
				if (!plugin.resolveImportMeta) continue;
				const result = plugin.resolveImportMeta.call(ctx, property);
				if (result) return result;
			}

			// handle file URLs by default
			const matches = property.match(/^ROLLUP_FILE_URL_(\d+)$/);
			if (matches) {
				const referenceId = matches[1];
				const result = container.resolveFileUrl({ referenceId });
				if (result) return result;
			}
		},

		/**
		 * @param {string} id
		 * @param {string} [importer]
		 * @param {[Plugin]} [_skip] internal
		 * @returns {Promise<import('rollup').ResolveIdResult>}
		 */
		async resolveId(id, importer, _skip) {
			let originalId = id;
			const key = identifierPair(id, importer);

			const opts = {};
			for (const p of plugins) {
				if (!p.resolveId) continue;

				if (_skip) {
					if (_skip.includes(p)) continue;
					if (resolveSkips.has(p, key)) continue;
					resolveSkips.add(p, key);
				}

				plugin = p;

				let result;
				try {
					result = await p.resolveId.call(ctx, id, importer);
				} finally {
					if (_skip) resolveSkips.delete(p, key);
				}

				if (!result) continue;
				if (typeof result === 'string') {
					id = result;
				} else {
					id = result.id;
					Object.assign(opts, result);
				}

				logResolve(`${formatResolved(originalId, id)} [${p.name}]`);
				// resolveId() is hookFirst - first non-null result is returned.
				break;
			}

			opts.id = id;
			return Object.keys(opts).length > 1 ? opts : id;
		},

		/**
		 * @param {string} code
		 * @param {string} id
		 */
		async transform(code, id) {
			/** @type {import('./sourcemap.js').SourceMap[]} */
			const sourceMaps = [];

			for (plugin of plugins) {
				if (!plugin.transform) continue;
				const result = await plugin.transform.call(ctx, code, id);
				if (!result) continue;

				logTransform(`${kl.dim(formatPath(id))} [${plugin.name}]`);
				if (typeof result === 'object') {
					if (result.map) {
						// Normalize source map sources URLs for the browser
						result.map.sources = result.map.sources.map(s => {
							if (typeof s === 'string') {
								return `/${posix.normalize(s)}`;
							} else if (hasDebugFlag()) {
								logTransform(kl.yellow(`Invalid source map returned by plugin `) + kl.magenta(plugin.name));
							}

							return s;
						});

						sourceMaps.push(result.map);
					} else if (result.code !== code) {
						logTransform(kl.yellow(`Missing sourcemap result in transform() method of `) + kl.magenta(plugin.name));
					}

					code = result.code;
				} else {
					if (code !== result) {
						logTransform(kl.yellow(`Missing sourcemap result in transform() method of `) + kl.magenta(plugin.name));
					}
					code = result;
				}
			}
			return { code, map: sourceMaps.length ? mergeSourceMaps(sourceMaps) : null };
		},

		/**
		 * @param {string} id
		 * @returns {Promise<import('rollup').LoadResult>}
		 */
		async load(id) {
			for (plugin of plugins) {
				if (!plugin.load) continue;
				const result = await plugin.load.call(ctx, id);
				if (result) {
					logLoad(`${kl.dim(formatPath(id))} [${plugin.name}]`);
					return result;
				}
			}
			logLoad(`${kl.dim(formatPath(id))} [__fallback__]`);
			return null;
		},

		resolveFileUrl({ referenceId }) {
			referenceId = String(referenceId);
			const file = files.get(referenceId);
			if (file == null) return null;
			const out = resolve(opts.cwd || '.', ctx.outputOptions.dir || '.');
			const fileName = isAbsolute(file.filename) ? relative(out, file.filename) : file.filename;
			const assetInfo = {
				referenceId,
				fileName,
				// @TODO: this should be relative to the module that imported the asset
				relativePath: fileName
			};
			for (plugin of plugins) {
				if (!plugin.resolveFileUrl) continue;
				const result = plugin.resolveFileUrl.call(ctx, assetInfo);
				if (result != null) {
					return result;
				}
			}
			return JSON.stringify(posix.normalize('/' + fileName.split(sep).join(posix.sep)));
		}
	};

	// Tracks recursive resolveId calls
	const resolveSkips = {
		/** @type {Map<Plugin, string[]>} */
		skip: new Map(),
		/** @param {Plugin} plugin @param {string} key */
		has(plugin, key) {
			const skips = this.skip.get(plugin);
			return skips ? skips.includes(key) : false;
		},
		/** @param {Plugin} plugin @param {string} key */
		add(plugin, key) {
			const skips = this.skip.get(plugin);
			if (skips) skips.push(key);
			else this.skip.set(plugin, [key]);
		},
		/** @param {Plugin} plugin @param {string} key */
		delete(plugin, key) {
			const skips = this.skip.get(plugin);
			if (!skips) return;
			const i = skips.indexOf(key);
			if (i !== -1) popIndex(skips, i);
		}
	};

	ctx.options = container.options({
		acornInjectPlugins: []
	});

	return container;
}
