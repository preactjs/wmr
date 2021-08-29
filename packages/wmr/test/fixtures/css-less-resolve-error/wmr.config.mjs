export default {
	plugins: [
		{
			name: 'foo',
			resolveId(id) {
				if (id === 'bar') {
					throw new Error('fail');
				}
			}
		}
	]
};
