import { transform } from '../lib/acorn-traverse.js';

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
 * @param {object} [options]
 * @param {string} [options.NODE_ENV] constant to inline for `process.env.NODE_ENV`
 * @param {Record<string, string>} [options.env]
 * @returns {import('rollup').Plugin}
 */
export default function processGlobalPlugin({ NODE_ENV = 'development', env = {} } = {}) {
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
			const orig = code;

			const result = transform(code, {
				plugins: [acornEnvPlugin({ ...env, NODE_ENV })],
				parse: this.parse
			});

			code = result.code;

			// if that wasn't the only way `process.env` was referenced...
			if (code.match(/[^a-zA-Z0-9]process\.env/)) {
				// hack: avoid injecting imports into commonjs modules
				if (/^\s*(import|export)[\s{]/gm.test(code)) {
					code = `import process from '${PREFIX}process.js';${code}`;
				} else {
					code = `var process=${processObj};${code}`;
				}
			}

			code = code.replace(/typeof(\s+|\s*\(+\s*)process([^a-zA-Z$_])/g, 'typeof$1undefined$2');

			if (code !== orig) {
				return { code, map: null };
			}
		}
	};
}
