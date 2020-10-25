import { promises as fs } from 'fs';
import renderToString from 'preact-render-to-string';

async function prepass(vnode, maxDepth = 20, maxTime = 5000) {
	let attempts = 0;
	const start = Date.now();
	while (++attempts < maxDepth && Date.now() - start < maxTime) {
		try {
			return renderToString(vnode);
		} catch (e) {
			if (e && e.then) {
				await e;
				continue;
			}
			throw e;
		}
	}
}

export async function ssr({ url }) {
	const { App } = await import('./index.tsx');
	let body = await prepass(<App />, 20, 5000);
	try {
		const html = await fs.readFile('./public/index.html', 'utf-8');
		// body = html.replace(/(<div id="app_root">)<\/div>/, '$1' + body + '</div>');
		if (/<body(?:\s[^>]*?)?>/.test(html)) {
			body = html.replace(/(<body(?:\s[^>]*?)?)>/, '$1 ssr>' + body);
		} else {
			body = html + body;
		}
	} catch (e) {
		console.warn('Failed to load HTML template: ', e);
	}
	// await new Promise(f => setTimeout(f, 4000));
	return body;
	// let attempts = 0;
	// const start = Date.now();
	// while (++attempts < 20 && Date.now() - start < 5000) {
	// 	try {
	// 		return renderToString(<App />);
	// 	} catch (e) {
	// 		if (e && e.then) {
	// 			await e;
	// 			continue;
	// 		}
	// 		throw e;
	// 	}
	// }
}

// console.log('SSR: ', ssr());
