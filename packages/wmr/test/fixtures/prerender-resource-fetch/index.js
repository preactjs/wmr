export async function prerender() {
	const md = await fetch('/content.md').then(res => res.text());
	return { html: md, links: ['/'] };
}
