import { resolve, dirname, relative } from 'path';
import { promisify } from 'util';

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
			resolve('node_modules/node-sass'),
			resolve('node_modules/node-sass'),
			'sass',
			'node-sass',
			resolve('node_modules/node-sass/lib/index.js')
		];
		let sassLib;
		for (const loc of locations) {
			if ((sassLib = await req(loc))) {
				if (process.env.DEBUG) {
					console.log('Using sass from ' + relative('.', loc));
				}
				break;
			}
		}
		if (sassLib) {
			sass = promisify(sassLib.render.bind(sass));
		} else {
			console.warn(
				`Please install a sass implementation to use sass/scss:\n    npm i -D sass\n  or:\n    npm i -D node-sass`
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
