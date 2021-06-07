import { promises as fs } from 'fs';
import * as kl from 'kolorist';
import { basename, dirname, relative, resolve, sep, posix } from 'path';
import { transformCssImports } from '../../lib/transform-css-imports.js';
import { transformCss } from '../../lib/transform-css.js';
import { matchAlias } from '../../lib/aliasing.js';

// invalid object keys
const RESERVED_WORDS = /^(abstract|async|boolean|break|byte|case|catch|char|class|const|continue|debugger|default|delete|do|double|else|enum|export|extends|false|final|finally|float|for|function|goto|if|implements|import|in|instanceof|int|interface|let|long|native|new|null|package|private|protected|public|return|short|static|super|switch|synchronized|this|throw|throws|transient|true|try|typeof|var|void|volatile|while|with|yield)$/;

/**
 * @param {string} css
 * @param {string} id cwd-relative path to the stylesheet, no leading `./`
 * @param {string[]} [mappings] an array to populate with object property code
 * @param {string} [idAbsolute] absolute filepath to the CSS file
 * @returns {Promise<string>}
 */
export async function modularizeCss(css, id, mappings = [], idAbsolute) {
	// normalize to posix id for consistent hashing
	if (id.match(/^[^/]*\\/)) id = id.split(sep).join(posix.sep);

	const suffix = '_' + hash(id);

	let currentMappings = new Map();
	const toCompose = new Map();

	let result = transformCss(css, (className, additionalClasses, specifier) => {
		let currentSuffix = suffix;
		// Inline external composed styles (composes: foo from './other.css')
		if (specifier) {
			const relativeImportee = posix.join(posix.dirname(id), specifier);
			currentSuffix = '_' + hash(relativeImportee);
			// addComposedCss(posix.join(posix.dirname(idAbsolute || id), specifier), relativeImportee, className);
			const filename = posix.join(posix.dirname(idAbsolute || id), specifier);
			let entry = toCompose.get(filename);
			if (!entry) {
				entry = { filename, classNames: new Set(), id: relativeImportee, suffix: currentSuffix };
				toCompose.set(filename, entry);
			}
			entry.classNames.add(className);
		}
		const mapped = className + currentSuffix;
		let m = currentMappings.get(className);
		if (!m) {
			m = new Set([mapped]);
			currentMappings.set(className, m);
		}
		// {button:"button_abcde another-composed-class_12345"}
		if (additionalClasses) {
			for (const c of additionalClasses.trim().split(' ')) {
				m.add(c);
			}
		}
		return mapped;
	});

	result += (
		await Promise.all(
			Array.from(toCompose.values()).map(async entry => {
				let css = await fs.readFile(entry.filename, 'utf-8');
				return transformCss(
					css,
					(c, additionalClasses, specifier) => {
						if (specifier || additionalClasses) {
							console.error(`Recursive/nested ICSS "composes:" is not currently supported.`);
						}
						return c + entry.suffix;
					},
					rule => {
						// only include rules that were composed
						for (const c of entry.classNames) {
							if (rule.value.split(/[: ()[\],>&+*]/).indexOf('.' + c)) return true;
						}
					}
				);
			})
		)
	).join('');

	currentMappings.forEach((value, key) => {
		// quote keys only if necessary:
		const q = /^\d|[^a-z0-9_$]/gi.test(key) ? `'` : ``;
		const mapped = Array.from(value).join(' ');
		mappings.push(`${q + key + q}:'${mapped}'`);
	});

	return result;
}

/**
 * Implements hot-reloading for stylesheets imported by JS.
 * @param {object} options
 * @param {string} [options.cwd] Manually specify the cwd from which to resolve filenames (important for calculating hashes!)
 * @param {boolean} [options.hot] Indicates the plugin should inject a HMR-runtime
 * @param {boolean} [options.fullPath] Preserve the full original path when producing CSS assets
 * @param {boolean} [options.production]
 * @param {Record<string, string>} options.alias
 * @returns {import('rollup').Plugin}
 */
export default function wmrStylesPlugin({ cwd, hot, fullPath, production, alias }) {
	const cwds = new Set();

	let assetId = 0;
	const assetMap = new Map();

	return {
		name: 'wmr-styles',
		options(opts) {
			cwds.clear();
			forEachInput(opts.input, input => {
				const entry = resolve('.', input);
				cwds.add(dirname(entry));
			});
			return opts;
		},
		async transform(source, id) {
			if (!id.match(/\.(css|s[ac]ss)$/)) return;
			if (id[0] === '\0') return;

			const isIcss = /(composes:|:global|:local)/.test(source);
			const isModular = /\.module\.(css|s[ac]ss)$/.test(id);

			let idRelative = id;
			let aliased = matchAlias(alias, id);
			if (aliased) {
				idRelative = aliased.slice('/@alias/'.length);
			} else {
				idRelative = cwd ? relative(cwd || '', id) : multiRelative(cwds, id);
			}

			if (idRelative.match(/^[^/]*\\/)) idRelative = idRelative.split(sep).join(posix.sep);

			const mappings = [];
			if (isModular) {
				source = await modularizeCss(source, idRelative, mappings, id);
			} else {
				if (isIcss) {
					console.warn(`Warning: ICSS ("composes:") is only supported in CSS Modules.`);
				}
				source = transformCss(source);
			}

			// Note: `plugin.generateBundle` is only called during prod builds for
			// CSS files. So we need to guard the url replacement code.
			if (production) {
				source = await transformCssImports(source, idRelative, {
					async resolveId(spec) {
						// Rollup doesn't allow assets to depend on other assets. This is a
						// pretty common case for CSS files referencing images or fonts. To
						// work around that we'll rewrite every file reference to
						// `__WMR_ASSET_ID_##`, similar to `import.meta.ROLLUP_FILE_URL_##`.
						// We'll resolve those in the `generateBundle` phase.
						// See: https://github.com/rollup/rollup/issues/2872
						if (spec.indexOf(':') === -1) {
							const absolute = resolve(dirname(idRelative), spec.split(posix.sep).join(sep));

							if (!absolute.startsWith(cwd)) return;

							const ref = `__WMR_ASSET_ID_${assetId++}`;
							assetMap.set(ref, {
								filePath: absolute,
								source: absolute.endsWith('.css') ? await fs.readFile(absolute, 'utf-8') : await fs.readFile(absolute)
							});
							return ref;
						}
					}
				});
			}

			const ref = this.emitFile({
				type: 'asset',
				name: fullPath ? undefined : basename(id).replace(/\.s[ac]ss$/, '.css'),
				fileName: fullPath ? (aliased ? `@alias/${idRelative}` : idRelative) : undefined,
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
				// import.meta.hot.accept((m) => {
				// 	for (let i in m.default) styles[i] = m.default[i];
				// 	for (let i in styles) if (!(i in m.default)) delete[i];
				// });
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
				map: null
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
		}
	};
}

function multiRelative(cwds, filename) {
	let p;
	cwds.forEach(cwd => {
		const f = relative(cwd, filename);
		if (!p || f.length < p.length) p = f;
	});
	return p;
}

function forEachInput(input, callback) {
	if (typeof input === 'object') {
		if (Array.isArray(input)) {
			for (let i = 0; i < input.length; i++) {
				forEachInput(input[i], callback);
			}
		} else {
			for (let i in input) forEachInput(input[i], callback);
		}
	} else if (typeof input === 'string') callback(input);
}

export function hash(str) {
	let hash = 5381,
		i = str.length;
	while (i) hash = (hash * 33) ^ str.charCodeAt(--i);
	return (hash >>> 0).toString(36);
}
