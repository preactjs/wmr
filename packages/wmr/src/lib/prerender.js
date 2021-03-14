import { Worker } from 'worker_threads';

/**
 * @param {object} options
 * @property {string} [cwd = '.']
 * @property {string} [out = '.cache']
 * @property {string} publicPath
 */
export function prerender({ cwd = '.', out = '.cache', publicPath }) {
	let w;
	try {
		w = new Worker(
			`(${workerCode})(require('worker_threads').workerData)
				.then(r => require('worker_threads').parentPort.postMessage([1,r]))
				.catch(err => require('worker_threads').parentPort.postMessage([0,err && err.stack || err+'']))`,
			{
				eval: true,
				workerData: { cwd, out, publicPath },
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
		w.on('message', ([f, d]) => (f ? resolve(d) : reject(d)));
		w.once('error', reject);
		w.once('exit', resolve);
	});
}

async function workerCode({ cwd, out, publicPath }) {
	/*global globalThis*/

	const path = require('path');
	const fs = require('fs').promises;
	const BEFORE = Symbol('before');
	const AFTER = Symbol('after');

	function enc(str) {
		return str.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
	}

	globalThis.location = /** @type {object} */ ({});

	globalThis.document = /** @type {object} */ ({
		createElement(type) {
			return { type };
		},
		querySelector() {},
		head: {
			[BEFORE]: '',
			[AFTER]: '',
			children: /** @type {any[]} */ ([]),
			appendChild(c) {
				this.children.push(c);
			},
			/** @param {'afterbegin'|'beforeend'} position @param {string} html */
			insertAdjacentHTML(position, html) {
				this[position === 'afterbegin' ? BEFORE : AFTER] += String(html);
			}
		}
	});

	globalThis.self = /** @type {any} */ (globalThis);

	// Inject a {type:module} package.json into the dist directory to enable Node's ESM loader:
	try {
		await fs.writeFile(path.resolve(cwd, out, 'package.json'), '{"type":"module"}');
	} catch (e) {
		throw Error(`Failed to write {"type":"module"} package.json to dist directory.\n  ${e}`);
	}

	// Grab the generated HTML file, which we'll use as a template:
	const tpl = await fs.readFile(path.resolve(cwd, out, 'index.html'), 'utf-8');

	// The first script in the file is assumed to have a .prerender export:
	let script = (tpl.match(/<script(?:\s[^>]*?)?\s+src=(['"]?)([^>]*?)\1(?:\s[^>]*?)?>/) || [])[2];
	if (!script) {
		throw Error(`Unable to detect <script src="entry.js"> in your index.html.`);
	}
	// script = new URL(`../dist/${script.replace(/^(\.?\/)?/g, '')}`, selfUrl).href;
	script = script.replace(publicPath, '');
	script = path.resolve(cwd, out, script.replace(/^(\.?\/)?/g, ''));

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

		// Reset document.head so that CSS for the current route will be injected into it:
		// @ts-ignore
		const head = (document.head.children = []);
		document.head[BEFORE] = document.head[AFTER] = '';

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
		const body = (result && result.html) || result;

		// Inject HTML links at the end of <head> for any stylesheets injected during rendering of the page:
		let headHtml = [
			document.head[BEFORE],
			...new Set(head.filter(c => c.rel && c.href).map(c => `<link rel="${enc(c.rel)}" href="${enc(c.href)}">`)),
			document.head[AFTER]
		].join('');

		let html = tpl;

		if (document.title) {
			const title = `<title>${enc(document.title)}</title>`;
			const matchTitle = /<title>([^<>]*?)<\/title>/i;
			if (matchTitle.test(html)) {
				html = html.replace(matchTitle, title);
			} else {
				headHtml = title + headHtml;
			}
		}

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
