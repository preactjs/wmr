export function prerender() {
	return { html: '<h1>it works</h1>', links: ['/'], head: { title: `Page: ${location.pathname}` } };
}
