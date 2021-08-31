export default {
	plugins: [
		{
			name: 'plugin-a',
			resolveId() {
				this.error(`oh no #1`);
			},
			load() {
				this.error(`oh no #2`);
			},
			transform() {
				this.error(`oh no #3`);
			}
		}
	]
};
