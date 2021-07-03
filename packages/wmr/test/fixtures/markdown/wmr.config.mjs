export default {
	plugins: [
		{
			name: 'markdown-plugin',
			resolveId(id) {
				if (/\.md$/.test(id)) {
					return id;
				}
			},
			load(id) {
				if (/\.md$/.test(id)) {
					return `export default "it works"`;
				}
			}
		}
	]
};
