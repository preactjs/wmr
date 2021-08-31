function Preact() {
	return 'it works';
}

function render() {
	document.getElementById('app').textContent = Preact();
}

render();
