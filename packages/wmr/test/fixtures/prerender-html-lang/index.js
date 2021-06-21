export function prerender() {
	return {
		html: '<h1>it works</h1>',
		links: ['/'],
		data: { hello: 'world' },
		head: { lang: 'my-lang', title: 'my-title', elements: new Set() }
	};
}
