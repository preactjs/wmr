import('./foo.json', { assert: { type: 'json' } }).then(json => {
	document.getElementById('json-1').textContent = JSON.stringify(json);
});
