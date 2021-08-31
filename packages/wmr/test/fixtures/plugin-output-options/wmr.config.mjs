export default {
	plugins: [
		{
			name: 'plugin-a',
			outputOptions(opts) {
				console.log(`OPTIONS format: ${opts.format}`);
			}
		}
	]
};
