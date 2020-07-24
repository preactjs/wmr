/**
 * Inject process globals and inline process.env.NODE_ENV.
 * @param {object} [options]
 * @param {string} [options.NODE_ENV] constant to inline for `process.env.NODE_ENV`
 * @returns {import('rollup').Plugin}
 */
export default function processGlobalPlugin({ NODE_ENV = 'development' } = {}) {
	const processObj = `{env:{NODE_ENV:${JSON.stringify(NODE_ENV)}}}`;

	return {
		name: 'process-global',
		resolveId(id) {
			if (id === '\0process.js') return id;
		},
		load(id) {
			if (id === '\0process.js') return `export default ${processObj};`;
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
				if (code.match(/[^\w-]import[\s{]/)) {
					code = `import process from '\0process.js';${code}`;
				} else {
					code = `var process=${processObj};${code}`;
				}
			}
			if (code !== orig) {
				return { code, map: null };
			}
		}
	};
}
