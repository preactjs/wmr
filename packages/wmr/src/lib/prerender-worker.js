import { parentPort, workerData } from 'worker_threads';
import { promises as fs } from 'fs';
import path from 'path';
import posthtml from 'posthtml';
import { walkHtmlNode } from './transform-html.js';

/**
 * @param {string} str
 * @returns {string}
 */
function enc(str) {
	return str.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

/** @typedef {{ type: string, props: Record<string, string>, children?: string } | string | null} HeadElement */

/**
 * @typedef {{ lang: string, title: string, elements: Set<HeadElement>}} HeadResult
 */

/**
 * @param {HeadElement|HeadElement[]} element
 * @returns {string} html
 */
function serializeElement(element) {
	if (element == null) return '';
	if (typeof element !== 'object') return String(element);
	if (Array.isArray(element)) return element.map(serializeElement).join('');
	const type = element.type;
	let s = `<${type}`;
	const props = element.props || {};
	let children = element.children;
	for (const prop of Object.keys(props).sort()) {
		const value = props[prop];
		// Filter out empty values:
		if (value == null) continue;
		if (prop === 'children' || prop === 'textContent') children = value;
		else s += ` ${prop}="${enc(value)}"`;
	}
	s += '>';
	if (!/link|meta|base/.test(type)) {
		if (children) s += serializeElement(children);
		s += `</${type}>`;
	}
	return s;
}

/**
 *
 * @param {{cwd: string, out: string, publicPath: string}} options
 * @returns {Promise<{ routes: Array<{ url: string }> }>}
 */
async function workerCode({ cwd, out, publicPath }) {
	/*global globalThis*/

	globalThis.location = /** @type {object} */ ({});

	globalThis.self = /** @type {any} */ (globalThis);

	// Inject a {type:module} package.json into the dist directory to enable Node's ESM loader:
	try {
		await fs.writeFile(path.resolve(cwd, out, 'package.json'), '{"type":"module"}');
	} catch (e) {
		throw Error(`Failed to write {"type":"module"} package.json to dist directory.\n  ${e}`);
	}

	// Grab the generated HTML file, which we'll use as a template:
	const tpl = await fs.readFile(path.resolve(cwd, out, 'index.html'), 'utf-8');

	// The first script in the file that is not external is assumed to have a
	// `prerender` export
	let script;
	const SCRIPT_TAG = /<script(?:\s[^>]*?)?\s+src=(['"]?)([^>]*?)\1(?:\s[^>]*?)?>/g;

	let match;
	while ((match = SCRIPT_TAG.exec(tpl))) {
		// Ignore external urls
		if (!match || /^(?:https?|file|data)/.test(match[2])) continue;

		script = match[2].replace(publicPath, '').replace(/^(\.?\/)?/g, '');
		script = path.resolve(cwd, out, script);
	}

	if (!script) {
		throw Error(`Unable to detect <script src="entry.js"> in your index.html.`);
	}

	/** @type {HeadResult} */
	let head = { lang: '', title: '', elements: new Set() };
	globalThis.wmr = { ssr: { head } };

	// Prevent Rollup from transforming `import()` here.
	const $import = new Function('s', 'return import(s)');
	const m = await $import('file:///' + script);
	const doPrerender = m.prerender;
	// const App = m.default || m[Object.keys(m)[0]];

	// We start by pre-rendering the homepage.
	// Links discovered during pre-rendering get pushed into the list of routes.
	const seen = new Set(['/']);
	let routes = [{ url: '/' }];

	for (const route of routes) {
		if (!route.url) continue;

		const outDir = route.url.replace(/(^\/|\/$)/g, '');
		const outFile = path.resolve(cwd, out, outDir, outDir.endsWith('.html') ? '' : 'index.html');
		// const outFile = toPath(new URL(`../dist${route.url.replace(/\/$/, '')}/index.html`, selfUrl));

		// Update `location` to current URL so routers can use things like location.pathname:
		const u = new URL(route.url, 'http://localhost');
		for (let i in u) {
			try {
				globalThis.location[i] = String(u[i]);
			} catch {}
		}

		head = { lang: '', title: '', elements: new Set() };

		// Do pre-rendering, as defined by the entry chunk:
		const result = await doPrerender({ ssr: true, url: route.url, route });

		if (result == null) continue;

		// Add any discovered links to the list of routes to pre-render:
		if (result.links) {
			for (let url of result.links) {
				const parsed = new URL(url, 'http://localhost');
				url = parsed.pathname;
				// ignore external links and one's we've already picked up
				if (seen.has(url) || parsed.origin !== 'http://localhost') continue;
				seen.add(url);
				routes.push({ url, _discoveredBy: route });
			}
		}

		let body;
		if (result && typeof result === 'object') {
			if (result.html) body = result.html;
			if (result.head) {
				head = result.head;
			}

			if (result.data && typeof result.data === 'object') {
				body += `<script type="isodata">${JSON.stringify(result.data)}</script>`;
			} else if (result.data) {
				console.warn('You passed in prerender-data in a non-object format: ', result.data);
			}
		} else {
			body = result;
		}

		let html = tpl;

		const transformer = posthtml([
			tree => {
				tree.walk(node => {
					if (!node) return node;

					// Add "lang" attribute to <html>
					if (node.tag === 'html') {
						if (!node.attrs) node.attrs = {};
						node.attrs.lang = head.lang;
					}

					// Update or inject title tag
					if (node.tag === 'head') {
						let hasTitle = false;

						walkHtmlNode(node, headNode => {
							if (headNode.tag === 'title') {
								hasTitle = true;
								headNode.content = [head.title];
							}
							return headNode;
						});

						if (!hasTitle) {
							// TODO: TS types of posthtml seem to be wrong
							// @ts-ignore
							node.content?.unshift({
								tag: 'title',
								attrs: {},
								content: [head.title]
							});
						}
					}

					return node;
				});
			}
		]);
		html = (await transformer.process(html)).html;

		// Inject HTML links at the end of <head> for any stylesheets injected during rendering of the page:
		let headHtml = head.elements ? Array.from(new Set(Array.from(head.elements).map(serializeElement))).join('') : '';
		html = html.replace(/(<\/head>)/, headHtml + '$1');

		// Inject pre-rendered HTML into the start of <body>:
		html = html.replace(/(<body(\s[^>]*?)?>)/, '$1' + body);

		// Write the generated HTML to disk:
		await fs.mkdir(path.dirname(outFile), { recursive: true }).catch(Object);
		await fs.writeFile(outFile, html);
	}
	await fs.unlink(path.resolve(cwd, out, 'package.json')).catch(Object);

	return { routes };
}

(async () => {
	try {
		const result = await workerCode(workerData);
		parentPort?.postMessage([1, result]);
	} catch (err) {
		console.log(err);
		parentPort?.postMessage([0, err]);
	}
})();
