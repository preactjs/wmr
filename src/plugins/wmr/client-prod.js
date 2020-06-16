export function createHotContext() {}

export function style(filename) {
	const node = document.createElement('link');
	node.rel = 'stylesheet';
	node.href = filename;
	document.head.appendChild(node);
}
