export async function prerender() {
	const html = await fetch('https://preactjs.com').then(res => res.text());
	return { html, links: ['/'] };
}
