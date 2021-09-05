export default {
	middleware: [false, undefined, null, 0],
	plugins: [
		false,
		undefined,
		null,
		0,
		{
			name: 'foo',
			configResolved() {
				return {
					middleware: [false, undefined, null, 0]
				};
			}
		}
	]
};
