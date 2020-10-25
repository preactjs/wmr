/*global globalThis,getBuiltin*/

const baseURL = globalThis.baseURL;
const GRAPH = globalThis._GRAPH;

// @ts-ignore-next
const require = getBuiltin('module').createRequire(process.cwd());

globalThis.WebSocket = require('ws');

// @ts-ignore-next
globalThis.self = globalThis;

// @ts-ignore-next
globalThis.location = {
	reload() {
		console.warn('Skipping location.reload()');
	}
};

function setLocation(url) {
	const loc = new URL(url, baseURL);
	for (let i in loc) {
		try {
			if (typeof loc[i] === 'string') {
				globalThis.location[i] = String(loc[i]);
			}
		} catch (e) {}
	}
}
setLocation(baseURL);

// used to put injects prior to initial ssr pass into globalInjects
let started = false;

// scripts and styles imported/injected by the current SSR process
let injects = new Map();

// imports that were resolved prior to ssr() being called, so are not necessarily client-side
const globalInjects = new Map();

const urlInjects = new Map();

const REQ = Symbol('requestId');
class Response {
	constructor(requestId) {
		this[REQ] = requestId;
	}
	setHeader(name, value) {
		if (process.send) process.send([-1, 'setHeader', this[REQ], name, value]);
	}
	flush() {
		if (process.send) process.send([-1, 'flush', this[REQ]]);
	}
}

// called before SSR starts
function prepare(opts) {
	opts.res = new Response(opts.requestId);
	started = true;
	setLocation(opts.url);
	if (injects !== globalInjects) {
		injects.clear();
	}
	injects = new Map();
}

// called after SSR finishes
function finish({ url, res }, result) {
	if (result instanceof Error) return;

	// if this is the first time rendering this URL, store import/inject mappings
	if (!urlInjects.get(url)) {
		urlInjects.set(url, new Map(injects));
	}

	const resources = [...injects.values()];
	const ui = urlInjects.get(url);
	const resourceUrls = resources.map(r => r.url);
	if (ui)
		for (const m of ui.values()) {
			if (!resourceUrls.includes(m.url)) {
				resources.push(m);
			}
		}
	injects.clear();
	injects = globalInjects;
	// const before = resources.map(r => r.url);

	// Mark all current modules in the graph as being completed (future imports are considered dynamic)
	for (const v of GRAPH.values()) v.completed = true;

	GRAPH.resolveStaticDependencies(resources);

	// console.log('  ' + resources.map(x => x.type + ' : ' + x.url + (before.includes(x.url)?'':' (inferred from dep graph)')).join('\n  '));

	const styles = resources.filter(s => s.type === 'style');
	const scripts = resources.filter(s => s.type === 'script');
	let head = '';
	let body = '';
	for (const style of styles) {
		head += `<link rel="stylesheet" href="${style.url}">`;
	}
	res.setHeader('Link', scripts.map(script => `<${script.url}>;rel=preload;as=script;crossorigin`).join(', '));

	for (const script of scripts) {
		// head += `<link rel="preload" as="script" href="${script.url}" crossorigin>`;
		body += `<script type="module" src="${script.url}"></script>`;
	}

	if (/<\/head>/i.test(result)) result = result.replace(/(<\/head>)/i, head + '$1');
	else result = head + result;
	if (/<\/body>/i.test(result)) result = result.replace(/(<\/body>)/i, body + '$1');
	else result += body;

	// result = result.replace(/<script type="module"/g, '<script type="not-module"');
	return result;
}

const has = (s, n) => s === n || (Array.isArray(s) && s.includes(n));

let timer;
globalThis.wmrssr = {
	cleanup() {},
	collect(type, url, id) {
		url = url.replace(/\?t=\d+/g, '');
		const key = type + ':' + url;
		const inject = { type, url, id };
		if (started) injects.set(key, inject);
		else globalInjects.set(key, inject);
	},
	before(method, args) {
		if (has(method, 'ssr')) prepare(args[0]);
	},
	commitSync(method, args, result) {
		if (!has(method, 'ssr')) return;
		// If SSR is taking a while but the module graph has settled, early-flush preload Links.
		timer = setTimeout(() => {
			if (GRAPH.pendingModules) return;
			const { url, res } = args[0];
			const resources = Array.from(injects.values());
			const ui = urlInjects.get(url);
			if (ui) for (const v of ui) if (!injects.has(v.url)) resources.push(v);
			GRAPH.resolveStaticDependencies(resources);
			res.setHeader('Link', resources.map(i => `<${i.url}>;rel=preload;as=${i.type};crossorigin`).join(', '));
			res.flush();
		}, 500);
	},
	after(method, args, result) {
		if (has(method, 'ssr')) {
			clearTimeout(timer);
			const r = finish(args[0], result[1] === '$reject$' ? Error(result[2]) : result[2]);
			if (r != null) result[2] = r;
		}
	},
	setMod(m) {
		if (m) {
			if ('resolve' in entryModule) entryModule.resolve(m);
			entryModule = m;
		} else if (!('resolve' in entryModule) || 'value' in entryModule) {
			entryModule = deferred();
		}
	}
};

let entryModule = deferred();

function deferred() {
	let resolve;
	/** @type {Promise & { resolve?(): void, value? }} */
	const p = new Promise(r => (resolve = r));
	p.resolve = v => resolve((p.value = v));
	return p;
}

entryModule.then(() => {
	if (process.send) process.send('init');
});

process.on('message', async ([id, method, ...args]) => {
	let m, fn;
	if (/^WMRSSR:/.test(method)) {
		fn = globalThis.wmrssr[method.slice(7)];
	} else {
		// wait for any in-flight hot reload:
		m = await entryModule;
		if (Array.isArray(method)) {
			for (let name of method) {
				if (name in m) {
					fn = m[name];
					break;
				}
			}
		} else {
			fn = m[method];
		}
	}

	await globalThis.wmrssr.before(method, args);
	globalThis.wmrssr.commitSync(method, args);
	const result = [id, '', null];
	try {
		const r = fn(...args);
		result[2] = await r;
		result[1] = '$resolve$';
	} catch (e) {
		result[2] = String((e && e.stack) || e.message || e);
		result[1] = '$reject$';
	} finally {
		await globalThis.wmrssr.after(method, args, result);
		if (process.send) process.send(result);
	}
});
