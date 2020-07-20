import { promises as fs } from 'fs';
import { basename, dirname, relative, resolve, sep, posix } from 'path';
// import { transformCss } from '../../lib/transform-css.js';

/**
 * @param {string} css
 * @param {string} id cwd-relative path to the stylesheet, no leading `./`
 * @param {string[]} [mappings] an array to populate with object property code
 * @returns {string}
 */
export function modularizeCss(css, id, mappings) {
	const classNames = new Set();
	const suffix = '_' + hash(id);
	const applyClassSuffix = className => {
		const mapped = className + suffix;
		if (mappings && !classNames.has(className)) {
			// quote keys only if necessary:
			const q = /^\d|[^a-z0-9_$]/gi.test(className) ? `'` : ``;
			mappings.push(`${q + className + q}:'${mapped}'`);
		}
		return mapped;
	};
	// return transformCss(css, applyClassSuffix);
	return css.replace(/(?:\/\*[\s\S]*?\*\/|\[.*?\]|{[\s\S]*?}|\.([^[\]:.{}()\s]+))/gi, (str, className) => {
		return className ? '.' + applyClassSuffix(className) : str;
	});
}

/**
 * Implements hot-reloading for stylesheets imported by JS.
 * @param {object} [options]
 * @param {string} [options.cwd] Manually specify the cwd from which to resolve filenames (important for calculating hashes!)
 * @param {boolean} [options.hot] Indicates the plugin should inject a HMR-runtime
 * @param {boolean} [options.fullPath] Preserve the full original path when producing CSS assets
 * @returns {import('rollup').Plugin}
 */
export default function wmrStylesPlugin({ cwd, hot, fullPath } = {}) {
	const cwds = new Set();

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
		async load(id) {
			if (!id.match(/\.css$/)) return;
			if (id[0] === '\b' || id[0] === '\0') return;

			let idRelative = cwd ? relative(cwd || '', resolve(cwd, id)) : multiRelative(cwds, id);
			if (idRelative.match(/^[^/]*\\/)) idRelative = idRelative.split(sep).join(posix.sep);
			// this.addWatchFile(id);
			let source = await fs.readFile(id, 'utf-8');
			const mappings = [];
			if (id.match(/\.module\.css$/)) {
				source = modularizeCss(source, idRelative, mappings);
			}

			const ref = this.emitFile({
				type: 'asset',
				name: fullPath ? undefined : basename(id),
				fileName: fullPath ? idRelative : undefined,
				source
			});

			let code = `
				import { style } from 'wmr';
				style(import.meta.ROLLUP_FILE_URL_${ref}, ${JSON.stringify(idRelative)});
				const styles = {${mappings.join(',')}};
				export default styles;
			`;

			if (hot) {
				// import.meta.hot.accept((m) => {
				// 	for (let i in m.default) styles[i] = m.default[i];
				// 	for (let i in styles) if (!(i in m.default)) delete[i];
				// });
				code += `
					import.meta.hot.accept(({ module: { default: s } }) => {
						for (let i in s) styles[i] = s[i];
					});
				`;
			}

			code = code.replace(/^\s+/gm, '');

			return {
				code,
				moduleSideEffects: true,
				syntheticNamedExports: true
			};
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
		}
		for (let i in input) forEachInput(input[i], callback);
	} else if (typeof input === 'string') callback(input);
}

export function hash(str) {
	let hash = 5381,
		i = str.length;
	while (i) hash = (hash * 33) ^ str.charCodeAt(--i);
	return (hash >>> 0).toString(36);
}
