export default {
	plugins: [
		{
			name: 'foo',
			watchChange(id, event) {
				console.log('WATCH', event.event, id);
			}
		}
	]
};
