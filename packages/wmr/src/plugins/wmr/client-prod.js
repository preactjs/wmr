export function createHotContext() {}

export function style(filename) {
	if (typeof document === 'undefined') return;

	const prev = document.querySelector('link[rel=stylesheet][href="' + filename + '"]');
	if (prev) return;
	const node = document.createElement('link');
	node.rel = 'stylesheet';
	node.href = filename;
	document.head.appendChild(node);
}
