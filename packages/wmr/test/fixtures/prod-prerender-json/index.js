import foo from './foo.json';

export function prerender() {
	document.title = `Page: ${location.pathname}`;

	const html = `<div>
		<h1>page = ${location.pathname}</h1>
		<p>JSON: ${JSON.stringify(foo)}</p>
	</div>`;
	return { html, links: ['/'] };
}
