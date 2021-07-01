export default {
	plugins: [
		{
			name: 'markdown-plugin',
			resolveId(id) {
				console.log(id);
			},
			load(id) {
				if (/\.md$/.test(id)) {
					return `export default "it works"`;
				}
			}
		}
	]
};
