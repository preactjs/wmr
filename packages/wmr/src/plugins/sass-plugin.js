import { dirname } from 'path';
import { promisify } from 'util';
import { debug } from '../lib/output-utils.js';
import * as kl from 'kolorist';

const log = debug('sass');

let sass;

/**
 * @param {import('node-sass').Options} opts
 * @returns {Promise<{ css: string, map?: string }>}
 */
async function renderSass(opts) {
	if (!sass) {
		for (const loc of ['sass', 'node-sass']) {
			try {
				const sassLib = await import(loc);
				log(`-> Using sass from ${kl.green(loc)}`);

				sass = promisify(sassLib.render.bind(sass));
				break;
			} catch (e) {}
		}

		if (!sass) {
			console.warn(
				`Please install a sass implementation to use sass/scss:\n    npm i -D sass\n  or:\n    npm i -D node-sass`
			);
			sass = ({ data }) => ({ css: data, map: null });
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

			const result = await renderSass({
				data: code,
				includePaths: [dirname(id)],
				file: id,
				outputStyle: production ? 'compressed' : undefined,
				sourceMap: sourcemap !== false
			});

			return {
				code: result.css,
				map: result.map || null
			};
		}
	};
}
