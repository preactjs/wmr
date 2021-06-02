import { resolve, dirname, relative } from 'path';
import { promisify } from 'util';
import * as kl from 'kolorist';
import { promises as fs } from 'fs';
import { hasDebugFlag } from '../lib/output-utils.js';
import { isFile } from '../lib/fs-utils.js';
import { resolveModule } from './npm-plugin/resolve.js';

const cjsDefault = m => ('default' in m ? m.default : m);
let sass;

/**
 * @param {import('node-sass').Options} opts
 * @returns {Promise<{ css: string, map?: string }>}
 */
async function renderSass(opts) {
	if (!sass) {
		let req = async m => {
			try {
				return cjsDefault(typeof require === 'function' ? eval(`require("${m}")`) : await import('' + m));
			} catch (e) {}
		};
		const locations = [
			resolve('node_modules/sass'),
			resolve('node_modules/node-sass'),
			'sass',
			'node-sass',
			resolve('node_modules/node-sass/lib/index.js')
		];
		let sassLib;
		for (const loc of locations) {
			let resolved = loc;
			try {
				resolved = await resolveModule(loc, {
					readFile: f => fs.readFile(f, 'utf-8'),
					hasFile: isFile,
					module: /node-sass/.test(loc) ? 'node-sass' : 'sass'
				});
			} catch (e) {
				// Most likely the sass lib doesn't exist
			}

			if ((sassLib = await req(resolved))) {
				if (hasDebugFlag()) {
					// eslint-disable-next-line no-console
					console.log('Using sass from ' + relative('.', resolved));
				}
				break;
			}
		}
		if (sassLib) {
			sass = promisify(sassLib.render.bind(sass));
		} else {
			console.warn(
				kl.yellow(
					`Please install a sass implementation to use sass/scss:\n    npm i -D sass\n  or:\n    npm i -D node-sass`
				)
			);
			sass = ({ data }) => Promise.resolve({ css: data, map: null });
		}
	}
	const result = await (await sass)(opts);
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
				map: (sourcemap && result.map) || null
			};
		}
	};
}
