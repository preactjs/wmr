export function createHotContext() {}

export function style(filename) {
	if (typeof document === 'undefined') {
		// eslint-disable-next-line no-undef
		wmr.ssr.head.elements.add({ type: 'link', props: { rel: 'stylesheet', href: filename } });
	} else {
		const prev = document.querySelector('link[rel=stylesheet][href="' + filename + '"]');
		if (prev) return;
		const node = document.createElement('link');
		node.rel = 'stylesheet';
		node.href = filename;
		document.head.appendChild(node);
	}
}
