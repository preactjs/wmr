import { dirname } from 'path';
import { promisify } from 'util';
import { debug } from '../lib/output-utils.js';
import * as kl from 'kolorist';

const log = debug('sass');

/** @type {undefined | ((options: import('sass').Options) => Promise<import('sass').Result>)} */
let sass;

/**
 * @param {import('sass').Options} opts
 * @returns {Promise<{ css: string, map?: string, includedFiles: string[] }>}
 */
async function renderSass(opts) {
	if (!sass) {
		for (const loc of ['sass', 'node-sass']) {
			try {
				log(kl.dim(`Attempting to load compiler from `) + kl.cyan(loc));
				let sassLib = await import(loc);
				sassLib = sassLib.default || sassLib;
				log(kl.dim(`Loaded compiler from `) + kl.green(loc));

				// @ts-ignore
				sass = promisify(sassLib.render.bind(sassLib));
				break;
			} catch (e) {}
		}

		if (!sass) {
			throw new Error(
				`Please install a sass implementation to use sass/scss:\n    npm i -D sass\n  or:\n    npm i -D node-sass`
			);
		}
	}

	const result = await sass(opts);
	log(kl.cyan(opts.file || '') + kl.dim(' compiled in ') + kl.lightMagenta(`+${result.stats.duration}ms`));

	return {
		css: result.css.toString(),
		map: result.map && result.map.toString(),
		includedFiles: result.stats.includedFiles
	};
}

/**
 * Transform SASS files with node-sass.
 * @param {object} [opts]
 * @param {boolean} [opts.production]
 * @param {boolean} [opts.sourcemap]
 * @returns {import('rollup').Plugin}
 */
export default function sassPlugin({ production = false, sourcemap = false } = {}) {
	/** @type {Map<string, Set<string>>} */
	const fileToBundles = new Map();

	return {
		name: 'sass',
		async transform(code, id) {
			if (id[0] === '\0') return;
			if (!/\.s[ac]ss$/.test(id)) return;

			const result = await renderSass({
				data: code,
				includePaths: [dirname(id)],
				file: id,
				outputStyle: production ? 'compressed' : undefined,
				sourceMap: sourcemap !== false
			});

			for (const file of result.includedFiles) {
				this.addWatchFile(file);

				if (!fileToBundles.has(file)) {
					fileToBundles.set(file, new Set());
				}
				// @ts-ignore
				fileToBundles.get(file).add(id);
			}

			return {
				code: result.css,
				map: result.map || null
			};
		},
		watchChange(id) {
			const bundle = fileToBundles.get(id);
			if (bundle) return Array.from(bundle);
		}
	};
}
