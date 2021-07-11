import sample from 'test';

sample({}).then(({ instance }) => {
	const r = instance.exports.add(42);
	if (r === 42) {
		document.querySelector('h1').textContent = 'it works';
	}
});
