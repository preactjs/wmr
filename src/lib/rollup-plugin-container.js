import * as acorn from 'acorn';
// Rollup respects "module", Node 14 doesn't.
const cjsDefault = m => ('default' in m ? m.default : m);
const { Parser } = cjsDefault(acorn);

/** @param {import('rollup').Plugin[]} plugins */
export function createPluginContainer(plugins, opts = {}) {
	if (!Array.isArray(plugins)) plugins = [plugins];

	let plugin;
	let parser = Parser;
	const ctx = {
		meta: {},
		options: {},
		parse(code, opts) {
			return parser.parse(code, {
				sourceType: 'module',
				ecmaVersion: 2020,
				locations: true,
				onComment: [],
				...opts
			});
		},
		warn(...args) {
			console.log(`[${plugin.name}]`, ...args);
		}
	};

	const container = {
		ctx,

		/** @type {OmitThisParameter<import('rollup').PluginHooks['options']>} */
		options(options) {
			for (plugin of plugins) {
				if (!plugin.options) continue;
				options = plugin.options.call(ctx, options) || options;
			}
			if (options.acornInjectPlugins) {
				parser = Parser.extend(...[].concat(options.acornInjectPlugins));
			}
			return options;
		},

		/** @param {string} property */
		resolveImportMeta(property) {
			for (plugin of plugins) {
				if (!plugin.resolveImportMeta) continue;
				const result = plugin.resolveImportMeta.call(ctx, property);
				if (result) return result;
			}
		},

		/**
		 * @param {string} id
		 * @param {string} [importer]
		 * @returns {Promise<import('rollup').ResolveIdResult>}
		 */
		async resolveId(id, importer) {
			const opts = {};
			for (plugin of plugins) {
				if (!plugin.resolveId) continue;
				const result = await plugin.resolveId.call(ctx, id, importer);
				if (!result) return null;
				if (typeof result === 'string') {
					id = result;
				} else {
					id = result.id;
					Object.assign(opts, result);
				}
			}
			opts.id = id;
			return Object.keys(opts).length > 1 ? opts : id;
		},

		/**
		 * @param {string} code
		 * @param {string} id
		 */
		async transform(code, id) {
			for (plugin of plugins) {
				if (!plugin.transform) continue;
				const result = await plugin.transform.call(ctx, code, id);
				if (!result) continue;
				if (typeof result === 'object') {
					code = result.code;
				} else {
					code = result;
				}
			}
			return code;
		}
	};

	ctx.options = container.options({
		acornInjectPlugins: []
	});

	return container;
}
