import { promises as fs } from 'fs';

export async function ssr(data) {
	let tpl = await fs.readFile('./public/index.html', 'utf-8');
	// The first script in the file is assumed to have a .prerender export:
	let script = (tpl.match(/<script(?:\s[^>]*?)?\s+src=(['"]?)([^>]*?)\1(?:\s[^>]*?)?>/) || [])[2];
	if (!script) throw Error(`Unable to detect <script src="entry.js"> in your index.html.`);
	const { prerender } = await import(script);
	const result = await prerender(data);
	const body = typeof result === 'string' ? result : result.html;
	if (/<body(?:\s[^>]*?)?>/.test(tpl)) {
		tpl = tpl.replace(/(<body(?:\s[^>]*?)?)>/, '$1 ssr>' + body);
	} else {
		tpl += body;
	}
	return tpl;
}
