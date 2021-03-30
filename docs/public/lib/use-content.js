import { useState } from 'preact/hooks';

const CACHE = new Map();

async function load(url) {
	const res = await fetch(url);
	let html = await res.text();
	let meta = {};
	html = html.replace(/^\n*<!--({.*?})-->\n*/, (s, j) => ((meta = JSON.parse(j)), ''));
	return { html, meta };
}

export function useContent(url) {
	url = '/' + url.replace(/(^\/|\/$|\.md$)/g, '') + '.md';
	let update = useState(0)[1];
	let p = CACHE.get(url);
	if (!p) {
		p = load(url);
		CACHE.set(url, p);
		p.then(
			v => update((p.v = v)),
			e => update((p.e = e))
		);
	}
	if (p.v) return p.v;
	if (p.e) throw p.e;
	throw p;
}
