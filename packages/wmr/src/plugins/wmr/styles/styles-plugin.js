import { promises as fs } from 'fs';
import * as kl from 'kolorist';
import { basename, dirname, relative, resolve, sep, posix, extname } from 'path';
import { transformCssImports } from '../../../lib/transform-css-imports.js';
import { transformCss } from '../../../lib/transform-css.js';
import { matchAlias } from '../../../lib/aliasing.js';
import { modularizeCss } from './css-modules.js';
import { wmrCodeFrame } from '../../../lib/output-utils.js';

export const STYLE_REG = /\.(?:css|s[ac]ss|less)$/;

// invalid object keys
const RESERVED_WORDS =
	/^(abstract|async|boolean|break|byte|case|catch|char|class|const|continue|debugger|default|delete|do|double|else|enum|export|extends|false|final|finally|float|for|function|goto|if|implements|import|in|instanceof|int|interface|let|long|native|new|null|package|private|protected|public|return|short|static|super|switch|synchronized|this|throw|throws|transient|true|try|typeof|var|void|volatile|while|with|yield)$/;

/**
 * Implements hot-reloading for stylesheets imported by JS.
 * @param {object} options
 * @param {string} options.root Manually specify the cwd from which to resolve filenames (important for calculating hashes!)
 * @param {boolean} [options.hot] Indicates the plugin should inject a HMR-runtime
 * @param {boolean} [options.production]
 * @param {boolean} [options.sourcemap]
 * @param {Record<string, string>} options.alias
 * @returns {import('rollup').Plugin}
 */
export default function wmrStylesPlugin({ root, hot, production, alias, sourcemap }) {
	let assetId = 0;
	const assetMap = new Map();
	/** @type {Map<string, Set<string>>} */
	const moduleMap = new Map();

	return {
		name: 'wmr-styles',
		async transform(source, id) {
			if (!STYLE_REG.test(id)) return;
			if (id[0] === '\0') return;

			let idRelative = id;
			let aliased = matchAlias(alias, id);
			idRelative = aliased ? aliased.slice('/@alias/'.length) : relative(root, id);

			const mappings = [];
			if (/\.module\.(css|s[ac]ss|less)$/.test(id)) {
				source = await modularizeCss(source, idRelative, mappings, id);
			} else {
				const match = source.match(/(composes:|:global|:local)/);
				if (match !== null) {
					const lines = source.slice(0, match.index).split('\n');
					const line = lines.length - 1;
					const column = lines[lines.length - 1].length;
					const codeFrame = wmrCodeFrame(source, line, column);

					const originalName = basename(idRelative);
					const nameHint = basename(idRelative, extname(idRelative)) + '.module' + extname(idRelative);

					const message = `Warning: Keyword "${match[0]}" is only supported in CSS Modules.\nTo resolve this warning rename the file from "${originalName}" to "${nameHint}" to enable CSS Modules.`;
					console.warn(`${kl.yellow(message)}\n  ${kl.dim(idRelative)}\n${codeFrame}`);
				}
				source = transformCss(source);
			}

			// Note: `plugin.generateBundle` is only called during prod builds for
			// CSS files. So we need to guard the url replacement code.
			const _self = this;
			source = await transformCssImports(source, idRelative, {
				async resolveId(spec) {
					// Rollup doesn't allow assets to depend on other assets. This is a
					// pretty common case for CSS files referencing images or fonts.
					// TODO: Reference ids need to be resolved to support virtual modules
					// TODO: Should we just inline CSS here to avoid having
					// to workaround rollup limitations?

					if (spec.indexOf(':') === -1) {
						const absolute = resolve(dirname(idRelative), spec.split(posix.sep).join(sep));

						if (!absolute.startsWith(root)) return;

						_self.addWatchFile(absolute);

						if (!moduleMap.has(absolute)) {
							moduleMap.set(absolute, new Set());
						}
						// @ts-ignore
						moduleMap.get(absolute).add(id);

						if (production) {
							// Rewrite every file reference to
							// `__WMR_ASSET_ID_##`, similar to `import.meta.ROLLUP_FILE_URL_##`.
							// We'll resolve those in the `generateBundle` phase.
							// See: https://github.com/rollup/rollup/issues/2872
							const ref = `__WMR_ASSET_ID_${assetId++}`;
							assetMap.set(ref, {
								filePath: absolute,
								source: absolute.endsWith('.css') ? await fs.readFile(absolute, 'utf-8') : await fs.readFile(absolute)
							});
							return ref;
						}

						// This is only viable for development mode, which
						// doesn't call generateBundle()
						const ref = _self.emitFile({
							type: 'asset',
							name: basename(absolute),
							source: absolute.endsWith('.css') ? await fs.readFile(absolute, 'utf-8') : await fs.readFile(absolute)
						});

						// Use JSON.parse to remove quotes.
						return JSON.parse(_self.getFileName(ref));
					}
				}
			});

			// Preserve asset path to avoid file clashes:
			//   foo/styles.module.css
			//   bar/styles.module.css
			// Both files above should not overwrite each other.
			// We don't have that problem in production, because
			// assets are hashed
			let fileName;
			if (!production) {
				fileName = id.startsWith('/@') ? `@id/${id}` : id;
				fileName += '?asset';
			}

			const ref = this.emitFile({
				type: 'asset',
				name: basename(id).replace(/\.(s[ac]ss|less)$/, '.css'),
				fileName,
				source
			});

			const named = mappings
				.map(m => {
					const matches = m.match(/^(['"]?)([^:'"]+?)\1:(.+)$/);
					if (!matches) return;
					if (RESERVED_WORDS.test(matches[2])) {
						const reserved = kl.magenta(String(matches[2]));
						const filePath = kl.cyan(idRelative);
						return console.warn(
							kl.yellow(`Cannot use reserved word "${reserved}" as classname; found in "${filePath}"`)
						);
					}
					let name = matches[2].replace(/-+([a-z0-9])/gi, (s, c) => c.toUpperCase());
					if (name.match(/^\d/)) name = '$' + name;
					return name + '=' + matches[3];
				})
				.filter(Boolean)
				.join(',');

			let code = `
				import { style } from 'wmr';
				style(import.meta.ROLLUP_FILE_URL_${ref}, ${JSON.stringify(idRelative)});
				const styles = {${mappings.join(',')}};
				export default styles;
				${named ? `export const ${named};` : ''}
			`;

			if (hot) {
				code += `
					import { createHotContext } from 'wmr';
					createHotContext(import.meta.url).accept(({ module: { default: s } }) => {
						for (let i in s) styles[i] = s[i];
					});
				`;
			}

			code = code.replace(/^\s+/gm, '');

			return {
				code,
				moduleSideEffects: true,
				syntheticNamedExports: true,
				map: sourcemap
					? {
							version: 3,
							sources: [],
							mappings: '',
							names: []
					  }
					: null
			};
		},
		async generateBundle(_, bundle) {
			for (const id in bundle) {
				const item = bundle[id];

				if (item.type === 'asset' && item.fileName.endsWith('.css')) {
					item.source = item.source.replace(/__WMR_ASSET_ID_\d+/g, m => {
						const mapped = assetMap.get(m);
						const ref = this.emitFile({
							type: 'asset',
							name: basename(mapped.filePath),
							source: mapped.source
						});

						return '/' + this.getFileName(ref);
					});
				}
			}
		},
		watchChange(id) {
			const importer = moduleMap.get(id);
			if (importer) return Array.from(importer);
		}
	};
}
