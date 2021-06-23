(async () => {
	const json = await import('./foo.json', { assert: { type: 'json' } });
	document.getElementById('json-1').textContent = JSON.stringify(json);
})();
