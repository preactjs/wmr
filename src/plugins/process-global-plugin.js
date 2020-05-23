export default function processGlobalPlugin() {
	return {
		name: 'process-global',
		resolveId(id) {
			if (id === '\0process.js') return id;
		},
		load(id) {
			if (id === '\0process.js') return `export default {env:{NODE_ENV:'development'}};`;
		},
		transform(code) {
			if (code.match(/[^a-zA-Z0-9]process\.env/)) {
				return { code: `import process from '\0process.js';${code}`, map: null };
			}
		}
	};
}
