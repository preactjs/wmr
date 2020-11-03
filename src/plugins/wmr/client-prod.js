export function createHotContext() {}

export function style(filename) {
	const prev = document.querySelector('link[rel=stylesheet][href="' + filename + '"]');
	if (prev) return Promise.resolve();
	if (prev) return;
	const node = document.createElement('link');
	node.rel = 'stylesheet';
	node.href = filename;
	document.head.appendChild(node);
	return new Promise(resolve => {
		node.onload = node.onerror = resolve;
	});
}
