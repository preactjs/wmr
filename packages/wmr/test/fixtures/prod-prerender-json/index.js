import foo from './foo.json';

export function prerender() {
	const html = `<div>
		<h1>page = ${location.pathname}</h1>
		<p>JSON: ${JSON.stringify(foo)}</p>
	</div>`;
	return { html, links: ['/'], head: { title: `Page: ${location.pathname}` } };
}
