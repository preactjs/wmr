const PAGES = ['/', '/other.html'];

export function prerender() {
	const link = document.createElement('link');
	link.rel = 'icon';
	link.href = `data:,favicon-for-${location.pathname}`;
	document.head.appendChild(link);

	document.head.insertAdjacentHTML('beforeend', '<meta property="og:title" content="Become an SEO Expert">');

	document.title = `Page: ${location.pathname}`;

	const html = `<h1>page = ${location.pathname}</h1>`;
	return { html, links: PAGES };
}
