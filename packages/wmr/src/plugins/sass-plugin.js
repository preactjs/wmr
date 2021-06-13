import path from 'path';
import { promisify } from 'util';
import { debug } from '../lib/output-utils.js';
import * as kl from 'kolorist';
import { promises as fs } from 'fs';

const log = debug('sass');

/** @type {undefined | ((options: import('sass').Options) => Promise<import('sass').Result>)} */
let sass;

/**
 * @param {import('sass').Options & {id:string}} options
 * @returns {Promise<{ css: string, map?: string, includedFiles: string[] }>}
 */
async function renderSass({ id, ...opts }) {
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
	log(kl.cyan(id) + kl.dim(' compiled in ') + kl.lightMagenta(`+${result.stats.duration}ms`));

	return {
		css: result.css.toString(),
		map: result.map && result.map.toString(),
		includedFiles: result.stats.includedFiles
	};
}

/**
 * Transform SASS files with node-sass.
 * @param {object} opts
 * @param {boolean} opts.production
 * @param {boolean} opts.sourcemap
 * @param {string} opts.root
 * @returns {import('rollup').Plugin}
 */
export default function sassPlugin({ production, sourcemap, root }) {
	/** @type {Map<string, Set<string>>} */
	const fileToBundles = new Map();

	async function sassResolver(url, prev, done, pluginResolve) {
		// TODO: Rollup only supports top to bottom compilation, but we
		// need a way to do the opposite here to support loading virtual
		// sass modules. This is a limitation in Rollup. So for now we only
		// do resolution here.
		const resolved = await pluginResolve(url);
		let file = resolved ? resolved.id : url;

		// Bail out if nothing changed.
		if (file === url) {
			done(null);
			return;
		}

		if (!path.isAbsolute(file)) {
			file = path.join(root, file);
		}
		const contents = await fs.readFile(file, 'utf-8');
		done({ file, contents });
	}

	return {
		name: 'sass',
		async transform(code, id) {
			if (id[0] === '\0') return;
			if (!/\.s[ac]ss$/.test(id)) return;

			const result = await renderSass({
				// Custom options for logging
				id,
				// Must have either "data" or "file" option. If both are set importers
				// will cease to function for some reason.
				data: code,
				includePaths: [path.dirname(id)],
				importer: [
					// Note: Async importers MUST return `undefined`, otherwise they
					// don't work!!!
					(url, prev, done) => {
						sassResolver(url, prev, done, this.resolve.bind(this));
					}
				],
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
