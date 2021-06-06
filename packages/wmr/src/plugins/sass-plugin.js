import { promisify } from 'util';
import * as kl from 'kolorist';
import { debug } from '../lib/output-utils.js';

let sass;

const log = debug('sass');

/**
 * @param {import('node-sass').Options} opts
 * @returns {Promise<{ css: string, map?: string }>}
 */
async function renderSass(opts) {
	if (!sass) {
		for (const lib of ['sass', 'node-sass']) {
			try {
				let mod = await import(lib);
				mod = 'default' in mod ? mod.default : mod;
				sass = promisify(mod.render);
				sass = opts =>
					new Promise((resolve, reject) => {
						mod.render(opts, (err, result) => {
							if (err) reject(err);
							else {
								console.log('RES', result, result.css.toString());
								resolve(result);
							}
						});
					});
				log(`Using package ${kl.cyan(lib)} for sass compilation`);
			} catch (e) {}
		}

		if (!sass) {
			console.warn(
				kl.yellow(
					`Please install a sass implementation to use sass/scss:\n    npm i -D sass\n  or:\n    npm i -D node-sass`
				)
			);
			sass = ({ data }) => Promise.resolve({ css: data, map: null });
		}
	}

	const result = await sass(opts);
	return {
		css: result.css.toString(),
		map: result.map && result.map.toString()
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
	return {
		name: 'sass',
		async transform(code, id) {
			if (id[0] === '\0') return;
			if (!/\.s[ac]ss$/.test(id)) return;

			console.log('compile sass', code);
			const result = await renderSass({
				data: code,
				// includePaths: [dirname(id)],
				file: id,
				importer: [
					(url, prev) => {
						console.log('importer', url, prev);
						return null;
					}
				],
				outputStyle: production ? 'compressed' : undefined,
				sourceMap: sourcemap !== false
			});

			return {
				code: result.css,
				map: (sourcemap && result.map) || null
			};
		}
	};
}
