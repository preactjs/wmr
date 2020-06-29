import * as sucrase from 'sucrase';

const cjsDefault = m => ('default' in m ? m.default : m);

/** @type {sucrase.transform} */
const transform = cjsDefault(sucrase).transform;

/**
 * Transform (TypeScript) files with Sucrase.
 * @param {object} [opts]
 * @param {string|RegExp|Array<string|RegExp>} [opts.include=[]] Process files matching these regular expressions
 * @param {boolean} [opts.typescript]
 * @param {boolean} [opts.sourcemap=false]
 * @param {boolean} [opts.production=false]
 */
export default function sucrasePlugin(opts = {}) {
	const include = [].concat(opts.include || []);
	const allTransforms = [];
	if (opts.typescript) allTransforms.push('typescript');

	function shouldProcess(id) {
		if (opts.typescript && /\.tsx?$/.test(id)) return true;
		return include.length > 0 && include.some(pattern => id.match(pattern));
	}

	return {
		name: 'sucrase',
		transform(code, id) {
			if (!shouldProcess(id)) return null;

			// What is this nonsense?
			// Sucrase fails to parse JSX if the JSX transform is not enabled, but we don't want it enabled.
			// Here we trick Sucrase into thinking the JSX transform is enabled when it calls parse().
			// Transformation checks .includes("jsx") a second time, for which we return false preventing the transform.
			let jsxInjected = false;
			const transforms = allTransforms.slice();
			transforms.includes = function (v) {
				if (v === 'jsx' && !jsxInjected) {
					return (jsxInjected = true);
				}
				return allTransforms.includes(v);
			};

			const result = transform(code, {
				transforms,
				production: opts.production === true,
				filePath: id,
				sourceMapOptions: opts.sourcemap
					? {
							compiledFilename: id
					  }
					: undefined
			});

			return {
				code: result.code,
				map: opts.sourcemap ? result.sourceMap : null
			};
		}
	};
}
