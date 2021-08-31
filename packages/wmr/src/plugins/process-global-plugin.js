import MagicString from 'magic-string';
import path from 'path';
import { transform } from '../lib/acorn-traverse.js';
import { mergeSourceMaps } from '../lib/sourcemap.js';

/**
 * Plugin to replace `process.env.MY_VAR` or `import.meta.env.MY_VAR` with
 * the actual value.
 * @param {Record<string, string>} env
 */
function acornEnvPlugin(env) {
	return () => {
		return {
			name: 'transform-env',
			visitor: {
				MemberExpression(path) {
					const source = path.getSource();
					const match = source.match(/^(?:import\.meta|process)\.env\.(.+)/);

					if (match) {
						const value = env[match[1]];
						// Replace non-existing env variables with undefined
						if (value === undefined) {
							path.replaceWith({
								type: 'Identifier',
								name: 'undefined'
							});
						} else {
							path.replaceWithString(JSON.stringify(value));
						}
					}
				}
			}
		};
	};
}

/**
 * Inject process globals and inline process.env.NODE_ENV.
 * @param {object} options
 * @param {string} [options.NODE_ENV] constant to inline for `process.env.NODE_ENV`
 * @param {Record<string, string>} [options.env]
 * @param {boolean} [options.sourcemap]
 * @returns {import('rollup').Plugin}
 */
export default function processGlobalPlugin({ NODE_ENV = 'development', env = {}, sourcemap }) {
	const processObj = JSON.stringify({ browser: true, env: { ...env, NODE_ENV } });

	const PREFIX = `\0builtins:`;

	return {
		name: 'process-global',
		resolveId(id) {
			if (id === `${PREFIX}process.js`) return id;
		},
		load(id) {
			if (id === `${PREFIX}process.js`) return `export default ${processObj};`;
		},
		transform(code, id) {
			if (!/\.([tj]sx?|mjs)$/.test(id)) return;

			const result = transform(code, {
				plugins: [acornEnvPlugin({ ...env, NODE_ENV })],
				parse: this.parse,
				filename: id,
				// Default is to generate sourcemaps, needs an explicit
				// boolean
				sourceMaps: !!sourcemap
			});

			code = result.code;
			const s = new MagicString(code);

			// if that wasn't the only way `process.env` was referenced...
			if (code.match(/[^a-zA-Z0-9]process\.env/)) {
				// hack: avoid injecting imports into commonjs modules
				if (/^\s*(import|export)[\s{]/gm.test(code)) {
					s.prepend(`import process from '${PREFIX}process.js';\n`);
				} else {
					s.prepend(`var process=${processObj};\n`);
				}
			} else {
				const reg = /typeof(\s+|\s*\(+\s*)process([^a-zA-Z$_.])/g;
				let match = null;
				while ((match = reg.exec(code)) !== null) {
					s.overwrite(match.index, match.index + match[0].length, `typeof${match[1]}undefined${match[2]}`);
				}
			}

			/** @type {*} */
			const map = sourcemap
				? mergeSourceMaps([
						result.map,
						s.generateMap({ source: id, file: path.posix.basename(id), includeContent: true })
				  ])
				: null;

			return {
				code: s.toString(),
				map
			};
		}
	};
}
