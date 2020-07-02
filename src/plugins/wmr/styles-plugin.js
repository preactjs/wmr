import { promises as fs } from 'fs';
import { basename, dirname, relative, resolve } from 'path';

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
		// async transform(code, id) {
		// 	if (!id.match(/\.css$/gi)) return;
		// 	// console.log('transforming CSS', id);
		// 	return code;
		// },
		// resolveFileUrl({ })
		async load(id) {
			if (!id.match(/\.css$/)) return;
			const idRelative = cwd ? relative(cwd || '', resolve(cwd, id)) : multiRelative(cwds, id);
			// this.addWatchFile(id);
			let source = await fs.readFile(id, 'utf-8');
			let mappings = [];
			if (id.match(/\.module\.css$/)) {
				const suffix = '_' + hash(idRelative);
				source = source.replace(/\.([a-z0-9_-]+)/gi, (str, className) => {
					const mapped = className + suffix;
					const q = /^\d|[^a-z0-9_$]/gi.test(className) ? `'` : ``;
					mappings.push(`${q + className + q}:'${mapped}'`);
					return `.${mapped}`;
				});
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
				// 	console.log({...styles}, {...m.default});
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
