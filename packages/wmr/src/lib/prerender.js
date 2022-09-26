import { Worker } from 'worker_threads';

/**
 * @param {object} options
 * @property {string} [cwd = '.']
 * @property {string} [out = '.cache']
 * @property {string} publicPath
 * @property {any[]} customRoutes
 */
export function prerender({ cwd = '.', out = '.cache', publicPath, customRoutes }) {
	let w;
	try {
		w = new Worker(
			`(${workerCode})(require('worker_threads').workerData)
				.then(r => require('worker_threads').parentPort.postMessage([1,r]))
				.catch(err => require('worker_threads').parentPort.postMessage([0,err && err.stack || err+'']))`,
			{
				eval: true,
				workerData: { cwd, out, publicPath, customRoutes },
				// execArgv: ['--experimental-modules'],
				stderr: true
			}
		);
	} catch (e) {
		throw Error(
			`Failed to prerender, Workers aren't supported in your current Node.JS version (try v14 or later).\n  ${e}`
		);
	}

	// @ts-ignore-next
	w.stderr.on('data', m => {
		if (!/^\(node:\d+\) ExperimentalWarning:/.test(m.toString('utf-8'))) process.stderr.write(m);
	});
	return new Promise((resolve, reject) => {
		const bubbleError = error => {
			if (typeof error === 'string') {
				const err = new Error('Prerendering Error: ' + error.replace(/\n {4}at [\s\S]+$/g, ''));
				err.stack = error;
				return reject(err);
			}
			reject(error);
		};
		w.on('message', ([f, d]) => (f ? resolve(d) : bubbleError(d)));
		w.once('error', bubbleError);
		w.once('exit', resolve);
	});
}

async function workerCode({ cwd, out, publicPath, customRoutes }) {
	/*global globalThis*/

	const path = require('path');
	const fs = require('fs').promises;

	function enc(str) {
		return str.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
	}

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

	// The last script in the file that is not external is assumed to have a
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

	/** @typedef {{ type: string, props: Record<string, string>, children?: string } | string | null} HeadElement */

	/**
	 * @type {{ lang: string, title: string, elements: Set<HeadElement>}}
	 */
	let head = { lang: '', title: '', elements: new Set() };
	globalThis.wmr = { ssr: { head } };

	async function localFetcher(url) {
		const text = () => fs.readFile(`${out}/${String(url).replace(/^\//, '')}`, 'utf-8');
		return { text, json: () => text().then(JSON.parse) };
	}

	const pattern = /^\//;
	if (globalThis.fetch === undefined) {
		// When Node.js version under 17, native fetch API undefined
		// So it will give a warning when the syntax to retrieve the file and the url is passed
		// @ts-ignore
		globalThis.fetch = async url => {
			if (pattern.test(String(url))) {
				return localFetcher(url);
			}

			console.warn(`fetch is not defined in Node.js version under 17, please upgrade to Node.js version 18 later`);
		};
	} else {
		// At that time, implement using reassignment to avoid entering an infinite loop.
		const fetcher = fetch;
		// @ts-ignore
		delete globalThis.fetch;

		// When Node.js version 18 later, native fetch API is defined
		// Override with own implementation if you want to retrieve local files in Node.js 18 later
		// ref https://github.com/preactjs/wmr/pull/935#discussion_r977168334
		// @ts-ignore
		globalThis.fetch = async (url, options) => {
			if (pattern.test(String(url))) {
				return localFetcher(url);
			}

			// When fetching an external resource, it returns the native fetch API
			// though `fetcher` function is an alias created to avoid infinite loops
			return fetcher(url, options);
		};
	}

	// Prevent Rollup from transforming `import()` here.
	const $import = new Function('s', 'return import(s)');
	const m = await $import('file:///' + script);
	const doPrerender = m.prerender;
	// const App = m.default || m[Object.keys(m)[0]];

	if (typeof doPrerender !== 'function') {
		throw Error(`No prerender() function was exported by the last non-external <script src="..."> in your index.html.`);
	}

	/**
	 * @param {HeadElement|HeadElement[]|Set<HeadElement>} element
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
	// We start by pre-rendering the homepage.
	// Links discovered during pre-rendering get pushed into the list of routes.
	const seen = new Set(['/', ...customRoutes]);
	let routes = [...seen].map(link => ({ url: link }));

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
				body += `<script type="wmrdata">${JSON.stringify(result.data)}</script>`;
			} else if (result.data) {
				console.warn('You passed in prerender-data in a non-object format: ', result.data);
			}
		} else {
			body = result;
		}

		// TODO: Use a proper HTML parser here. We should definitely not parse HTML
		// with regex :S

		// Inject HTML links at the end of <head> for any stylesheets injected during rendering of the page:
		let headHtml = head.elements ? Array.from(new Set(Array.from(head.elements).map(serializeElement))).join('') : '';

		let html = tpl;

		if (head.title) {
			const title = `<title>${enc(head.title)}</title>`;
			const matchTitle = /<title>([^<>]*?)<\/title>/i;
			if (matchTitle.test(html)) {
				html = html.replace(matchTitle, title);
			} else {
				headHtml = title + headHtml;
			}
		}

		if (head.lang) {
			// TODO: This removes any existing attributes, but merging them without
			// a proper HTML parser is way too error prone.
			html = html.replace(/(<html(\s[^>]*?)?>)/, `<html lang="${enc(head.lang)}">`);
		}

		html = html.replace(/(<\/head>)/, (_, groupMatched) => headHtml + groupMatched);

		// Inject pre-rendered HTML into the start of <body>:
		html = html.replace(/(<body(\s[^>]*?)?>)/, (_, groupMatched) => groupMatched + body);

		// Write the generated HTML to disk:
		await fs.mkdir(path.dirname(outFile), { recursive: true }).catch(Object);
		await fs.writeFile(outFile, html);
	}
	await fs.unlink(path.resolve(cwd, out, 'package.json')).catch(Object);

	return { routes };
}
