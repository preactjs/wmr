export function prerender() {
	return { html: '<h1>it works</h1><script type="isodata"></script>', links: ['/'], data: { hello: 'world' } };
}
