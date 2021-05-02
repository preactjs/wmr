export function prerender() {
	document.title = `Page: ${location.pathname}`;
	return { html: '<h1>it works</h1>', links: ['/'] };
}
