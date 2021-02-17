/**
 * Inject process globals and inline process.env.NODE_ENV.
 * @param {object} [options]
 * @param {string} [options.NODE_ENV] constant to inline for `process.env.NODE_ENV`
 * @param {Record<string, string>} [options.env]
 * @returns {import('rollup').Plugin}
 */
export default function processGlobalPlugin({ NODE_ENV = 'development', env = {} } = {}) {
	const processObj = JSON.stringify({ browser: true, env: { ...env, NODE_ENV } });

	return {
		name: 'process-global',
		resolveId(id) {
			if (id === '\0builtins:process.js') return id;
		},
		load(id) {
			if (id === '\0builtins:process.js') return `export default ${processObj};`;
		},
		transform(code) {
			const orig = code;
			// TODO: this should probably use acorn-traverse.
			code = code.replace(
				/([(){}&|,;=!]\s*)process\.env\.NODE_ENV\s*([!=]==?)\s*(['"])(.*?)\3/g,
				(str, before, comparator, quote, value) => {
					let isMatch = value == NODE_ENV;
					if (comparator[0] == '!') isMatch = !isMatch;
					return before + isMatch;
				}
			);

			// if that wasn't the only way `process.env` was referenced...
			if (code.match(/[^a-zA-Z0-9]process\.env/)) {
				// hack: avoid injecting imports into commonjs modules
				if (/^\s*(import|export)[\s{]/gm.test(code)) {
					code = `import process from '\0builtins:process.js';${code}`;
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
