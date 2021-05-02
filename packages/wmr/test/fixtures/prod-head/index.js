const PAGES = ['/', '/other.html'];

export function prerender() {
	const html = `<h1>page = ${location.pathname}</h1>`;
	return {
		html,
		links: PAGES,
		head: {
			lang: 'de',
			links: [{ rel: 'icon', href: `data:,favicon-for-${location.pathname}` }],
			metas: [{ property: 'og:title', content: 'Become an SEO Expert' }],
			title: `Page: ${location.pathname}`
		}
	};
}
