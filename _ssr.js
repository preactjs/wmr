import { builtinModules } from 'module';
import { join } from 'path';
import { statSync } from 'fs';
import { URL, pathToFileURL, fileURLToPath } from 'url';
import { get as getHttp } from 'http';
import { get as getHttps } from 'https';
import { fork } from 'child_process';
// import { setupMaster, fork } from 'cluster';
// import { Worker } from 'worker_threads';

const cwd = pathToFileURL(`${process.cwd()}/`).href;
let root = cwd;
try {
	if (statSync(join(process.cwd(), 'public')).isDirectory()) {
		root = pathToFileURL(`${process.cwd()}/public`).href;
	}
} catch (e) {}

let baseURL = process.env.URL || `http://0.0.0.0:${process.env.PORT || 8080}`;

let ssr, proc, booted;

process.on('beforeExit', () => {
	try {
		proc && proc.kill();
		// ssr && ssr.terminate();
	} catch (e) {}
	try {
		// ssr && ssr.kill();
		ssr && ssr.terminate();
	} catch (e) {}
});

if (process.env.WMRSSR_HOST) {
	baseURL = process.env.WMRSSR_HOST;
} else {
	setupMaster({
		exec: fileURLToPath(new URL(`./src/cli.js`, import.meta.url))
	});
	proc = fork();
	proc = fork(fileURLToPath(new URL(`./src/cli.js`, import.meta.url)), [], {
		stdio: 'pipe'
	});
	proc.stderr.on('data', data => {
		process.stderr.write(data);
	});
	booted = new Promise(resolve => {
		proc.stdout.on('data', data => {
			process.stdout.write(data);
			const m = String(data).match(/Listening on (https?:\/\/[^ ]+)/);
			if (!m) return;
			baseURL = m[1];
			resolve();
		});
	});

	booted.then(() => {
		if (!process.argv[2]) {
			process.stderr.write(`No file specified:\n  wmr ssr path/to/file.js\n`);
			return process.exit(1);
		}

		// import(process.argv[2]);
		ssr = fork(fileURLToPath(new URL('./' + process.argv[2], root)), [], {
			stdio: 'inherit',
			execArgv: ['--experimental-modules', '--experimental-loader', import.meta.url],
			env: {
				WMRSSR_HOST: baseURL
			}
		});
		ssr.on('error', console.error);
		ssr.once('exit', process.exit);

		let c = 0;
		const p = new Map();
		function deferred() {
			const deferred = {};
			deferred.promise = new Promise((resolve, reject) => {
				deferred.resolve = resolve;
				deferred.reject = reject;
			});
			return deferred;
		}
		const ready = deferred();
		ssr.rpc = (fn, ...args) =>
			ready.promise.then(() => {
				const id = ++c;
				const controller = deferred();
				p.set(id, controller);
				ssr.send([id, fn, ...args]);
				return controller.promise;
			});
		ssr.on('message', data => {
			// console.log('parent message: ', data);
			if (data === 'init') {
				// ssr.send([++c, { url: '/' }]);
				ready.resolve();
			} else if (!Array.isArray(data)) return console.log('unknown message: ', data);
			// console.log(data);
			const [id, fn, ...args] = data;
			if (fn === '$resolve$') p.get(id).resolve(args[0]);
			else if (fn === '$reject$') p.get(id).reject(args[0]);
			else console.log('missed RPC: ', fn, '(', ...args, ') [', id, ']');
		});
		ssr.on('error', ready.reject);

		// const workerCode = `
		// 	import("${fileURLToPath(new URL('./' + process.argv[2], root))}").then(m => {
		// 		console.log(m);
		// 	});
		// `;
		// ssr = new Worker(`data:text/javascript,${encodeURIComponent(workerCode)}`, {
		// 	eval: true,
		// 	execArgv: ['--experimental-modules', '--experimental-loader', import.meta.url],
		// 	env: {
		// 		WMRSSR_HOST: baseURL,
		// 		NODE_OPTIONS: `--experimental-modules --experimental-loader=${JSON.stringify(import.meta.url)}`
		// 	}
		// });
		// ssr.on('error', console.error);
		// ssr.once('exit', code => {
		// 	console.log('worker exited: ', code);
		// 	process.exit(code);
		// });
	});
}

const fetch = url =>
	new Promise((resolve, reject) => {
		// console.log('fetch(', url, ')');
		// url = url.replace('0.0.0.0', 'localhost');
		(url.startsWith('https://') ? getHttps : getHttp)(url, res => {
			const text = new Promise(r => {
				let text = '';
				res.on('data', chunk => {
					text += chunk;
				});
				res.once('end', () => r(text));
			});
			resolve({
				url: res.url,
				ok: res.statusCode < 400,
				status: res.statusCode,
				text: () => text
			});
		}).once('error', reject);
	});

const CACHE = new Map();

export function getGlobalPreloadCode() {
	return `
		const require = getBuiltin('module').createRequire(process.cwd());
		globalThis.WebSocket = require('ws');
		globalThis.self = globalThis;
		globalThis.location = {
			reload() {
				console.warn("Skipping location.reload()");
			}
		};
		const baseURL = ${JSON.stringify(baseURL)};
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

		const has = (s, n) => s ===n || Array.isArray(s) && s.includes(n);

		let started = false;

		// scripts and styles imported/injected by the current SSR process
		let injects = new Map();

		// imports that were resolved prior to ssr() being called, so are not necessarily client-side
		const globalInjects = new Map();

		const urlInjects = new Map();

		function expandModuleGraph(resources, graph) {
			const seen = new Set();
			for (const entry of resources) seen.add(entry.url);
			for (const entry of resources) {
				const meta = graph.get(entry.url);
				if (!meta) continue;
				for (const dep of meta.imports) {
					const depMeta = graph.get(dep);
					if (!seen.has(dep)) {
						seen.add(dep);
						// if (!depMeta.url || depMeta.url === 'undefined') {
						// 	console.log('miss', depMeta, entry.url);
						// }
						resources.push(depMeta);
					}
				}
			}
		}

		function prepare(opts) {
			const { requestId, url } = opts;
			opts.res = new Response(opts.requestId);
			started = true;
			setLocation(url);
			injects.clear();
			injects = new Map();

			// const ui = urlInjects.get(url);
			// if (ui && ui.size) {
			// 	opts.res.setHeader('Link', Array.from(ui.values()).map(i => \`<\${i.url}>;rel=preload;as=\${i.type};crossorigin\`).join(', '));
			// 	// opts.res.flush();
			// }

			// let preload = [...new Map(urlInjects.get(url)).values()].map(i => \`<\${i.url}>;rel=preload;as=\${i.type};crossorigin\`);
			// let preload = [...new Map(urlInjects.get(url)).values()].filter(i=>i.type=='style').map(i => \`<\${i.url}>;rel=preload;as=\${i.type};crossorigin\`);
			// preload.push(...[...new Map(urlInjects.get(url)).values()].filter(i=>i.type=='script').map(i => \`<\${i.url}>;rel=modulepreload\`));
			// injects = new Map(urlInjects.get(url));
			// let preload = [...injects.values()].map(i => \`<\${i.url}>;rel=preload;as=\${i.type};crossorigin\`);
			// if (preload.length) {
			// 	opts.res.setHeader('Link', preload.join(', '));
			// }
		}
		const REQ = Symbol('requestId');
		class Response {
			constructor(requestId) {
				this[REQ] = requestId;
			}
			setHeader(name, value) {
				process.send([-1, 'setHeader', this[REQ], name, value]);
			}
			flush() {
				process.send([-1, 'flush', this[REQ]]);
			}
		}
		function finish({ url, res }, result) {
			if (result instanceof Error) return;

			// if this is the first time rendering this URL, store import/inject mappings
			if (!urlInjects.get(url)) {
				urlInjects.set(url, new Map(injects));
			}

			const resources = [...injects.values()];
			const ui = urlInjects.get(url);
			const resourceUrls = resources.map(r => r.url);
			if (ui) for (const m of ui.values()) {
				if (!resourceUrls.includes(m.url)) {
					resources.push(m);
					// console.log('injected script: ', m.url);
				}
			}
			injects.clear();
			// const before = resources.map(r => r.url);

			expandModuleGraph(resources, globalThis._GRAPH);

			// console.log('  ' + resources.map(x => x.type + ' : ' + x.url + (before.includes(x.url)?'':' (inferred from dep graph)')).join('\\n  '));

			const styles = resources.filter(s => s.type === 'style');
			const scripts = resources.filter(s => s.type === 'script');
			let head = '';
			let body = '';
			for (const style of styles) {
				head += \`<link rel="stylesheet" href="\${style.url}">\`;
			}
			// res.setHeader('Link', scripts.map(script => \`<\${script.url}>;rel=preload;as=script;crossorigin\`).join(', '));

			for (const script of scripts) {
				// head += \`<link rel="preload" as="script" href="\${script.url}" crossorigin>\`;
				body += \`<script type="module" src="\${script.url}"></script>\`;
			}

			if (/<\\/head>/i.test(result)) result = result.replace(/(<\\/head>)/i, head + '$1');
			else result = head + result;
			if (/<\\/body>/i.test(result)) result = result.replace(/(<\\/body>)/i, body + '$1');
			else result += body;

			// result = result.replace(/<script type="module"/g, '<script type="not-module"');
			return result;
		}
		globalThis.wmrssr = {
			cleanup() {},
			collect(type, url, id) {
				url = url.replace(/\\?t=\\d+/g, '');
				const key = type + ':' + url;
				const inject = { type, url, id };
				if (started) injects.set(key, inject);
				else globalInjects.set(key, inject);
			},
			before(method, args) {
				if (has(method, 'ssr')) prepare(args[0]);
			},
			commitSync(method, args, result) {
				// for (const item of globalThis._GRAPH.values()) 	item.completed = true;
			},
			after(method, args, result) {
				if (has(method, 'ssr')) {
					const r = finish(args[0], result[1] === '$reject$' ? Error(result[2]) : result[2]);
					if (r != null) result[2] = r;
				}
			}
		};
	`;
}

const isBuiltIn = specifier =>
	specifier.startsWith('node:') || specifier.startsWith('nodejs:') || builtinModules.includes(specifier);

// Node 15 switched from `nodejs:fs` to `node:fs` as a scheme for for built-in modules, so we detect it.
// @ts-ignore-next
const prefix = import('node:fs')
	.then(() => 'node:')
	.catch(() => 'nodejs:');

const GRAPH = new Map();
// gross: expose module graph data for use in the injected preload script
globalThis._GRAPH = GRAPH;
GRAPH.getModule = function (url, type) {
	let mod = GRAPH.get(url);
	if (mod) return mod;
	mod = {
		type: type || 'script',
		url,
		imports: [],
		dynamicImports: [],
		completed: false
	};
	GRAPH.set(url, mod);
	return mod;
};
GRAPH.addDependency = function (url, type, importer) {
	GRAPH.getModule(url, type);
	const parent = GRAPH.getModule(importer);
	// if (!parent.completed && parent.imports.length) {
	// 	// if (parent.imports.find(countDeps)) {
	// 	if (parent.imports.filter(countDeps).length === parent.imports.length) {
	// 		console.log(
	// 			'marking ' +
	// 				importer +
	// 				' as completed because all ' +
	// 				parent.imports.length +
	// 				' of its children has dependencies'
	// 		);
	// 		parent.completed = true;
	// 	}
	// }
	const group = parent.completed ? parent.dynamicImports : parent.imports;
	if (!group.includes(url)) {
		// console.log(url, parent.completed ? 'lazy' : 'static');
		group.push(url);
	}
};
// function countDeps(url) {
// 	const m = GRAPH.get(url);
// 	return m && m.imports.length;
// }

let first = true;
export async function resolve(specifier, context, defaultResolve) {
	const pfx = await prefix;
	if (specifier.startsWith('/@node/')) {
		// return { url: specifier.slice(7) };
		return { url: pfx + specifier.slice(7) };
		//return defaultResolve(specifier.slice(7), context, defaultResolve);
	}
	if (specifier.startsWith('/@npm/') && isBuiltIn(specifier.slice(6))) {
		// return { url: specifier.slice(6) };
		return { url: pfx + specifier.slice(6) };
		// return defaultResolve(specifier, context, defaultResolve);
	}

	if (specifier.startsWith('data:')) {
		return { url: specifier };
	}

	if (specifier.startsWith(root)) {
		// console.log(specifier, specifier.slice(root.length));
		specifier = specifier.slice(root.length);
	}
	const url = new URL(specifier, context.parentURL || baseURL).href;
	let relativeUrl = url;
	if (relativeUrl.startsWith(baseURL)) relativeUrl = relativeUrl.slice(baseURL.length);
	if (globalThis.wmrssr) {
		globalThis.wmrssr.collect('script', relativeUrl);
	}

	// build up module graph
	// const isDynamicImport = globalThis.wmrssr._committed;
	let p = context.parentURL || baseURL;
	if (p.startsWith(baseURL)) p = p.slice(baseURL.length);

	// console.log(relativeUrl, { ...context });

	// const parent = GRAPH.getModule(p, 'script');
	// if (!parent.completed) {
	// 	const childHasDeps = parent.imports.find(imp => {
	// 		const m = GRAPH.get(imp);
	// 		return m && m.imports.length;
	// 	});
	// 	if (childHasDeps) {
	// 		console.log('marking ' + p + ' as completed because one of its children has dependencies');
	// 		parent.completed = true;
	// 	}
	// }

	GRAPH.addDependency(relativeUrl, 'script', p);

	/*
	if (isDynamicImport) {
		console.log('dynamic import(): ', relativeUrl, p);
	}
	let parent = GRAPH.get(p);
	if (!parent) GRAPH.set(p, (parent = { type: 'script', url: p, imports: [], dynamicImports: [] }));
	parent[isDynamicImport ? 'dynamicImports' : 'imports'].push(relativeUrl);
	let self = GRAPH.get(relativeUrl);
	if (!self) GRAPH.set(relativeUrl, { type: 'script', url: relativeUrl, imports: [], dynamicImports: [] });
	// self[isDynamicImport ? 'imports' : 'dynamicImports'].push(url);
	*/

	// console.log('RESOLVE', specifier, p);
	const res = await fetch(url);
	const resolvedUrl = res.url || url;
	// console.log('RESOLVE: ', specifier, resolvedUrl.replace(baseURL, ''), context);
	CACHE.set(resolvedUrl, res);
	return { url: resolvedUrl };
	// return { url };
	// return defaultResolve(specifier, context, defaultResolve);
}

export function getFormat(url, context, defaultGetFormat) {
	if (isBuiltIn(url)) {
		return { format: 'builtin' };
	}
	return {
		format: 'module'
	};
	// return defaultGetFormat(url, context, defaultGetFormat);
}

export async function getSource(url, context, defaultGetSource) {
	if (isBuiltIn(url)) {
		return defaultGetSource(url, context, defaultGetSource);
	}

	if (url.startsWith('data:')) {
		const i = url.indexOf(',');
		let source = url.substring(i + 1);
		if (/;\s*base64$/.test(url.substring(0, i))) {
			source = Buffer.from(source, 'base64').toString('utf-8');
		}
		return { source };
	}

	// console.log('GET SOURCE', url);
	const spec = url.replace(baseURL, '');

	for (const m of GRAPH.values()) {
		if (m.imports.includes(spec)) {
			m.completed = true;
			// console.log(`Marking ${m.url.replace(baseURL, '')} as complete because a child is being loaded`);
			// break;
		}
	}

	// const res = await fetch(url);
	const res = CACHE.get(url) || (await fetch(url));
	let source = await res.text();
	if (res.status === 404) throw Error(`Module ${spec} not found`);
	if (!res.ok) throw Error(spec + ': ' + res.status + '\n' + source);
	if (new URL(url).pathname === '/_wmr.js') {
		source += `
			style = function(url, id) {
				const line = new Error().stack.split('\\n')[2];
				const index = line.indexOf(${JSON.stringify(baseURL)});
				if (index !== -1) {
					const p = line.substring(index + ${baseURL.length}).replace(/\\:\\d+\\:\\d+$/g, '');
					globalThis._GRAPH.addDependency(url, 'style', p);
					/*
					let parent = globalThis._GRAPH.get(p);
					if (!parent) globalThis._GRAPH.set(p, (parent = { type: 'script', url: p, imports: [], dynamicImports: [] }));
					parent.imports.push(url);
					if (!globalThis._GRAPH.get(url)) {
						globalThis._GRAPH.set(url, { type: 'style', url, imports: [], dynamicImports: [] });
					}
					*/
				}
				globalThis.wmrssr.collect('style', url, id);
			};
		`;
	}
	if (first) {
		// console.log('first', globalThis.location);
		first = false;
		source += `
			import { createHotContext as $$$cc } from '/_wmr.js';
			// import * as $$$WMR from '/_wmr.js';
			// const $$$cc = $$$WMR.createHotContext;

			(function() {
				const hot = $$$cc(import.meta.url);
				let mod;
				process.send('init');
				process.on('message', async ([id, method, ...args]) => {
					let m, fn;
					if (/^WMRSSR:/.test(method)) {
						fn = globalThis.wmrssr[method.slice(7)];
					} else {
						m = await mod;
						if (Array.isArray(method)) for (let name of method) if (name in m) {
							fn = m[name];
							break;
						} else {
							fn = m[method];
						}
					}
					await globalThis.wmrssr.before(method, args);
					globalThis.wmrssr.commitSync(method, args);
					const result = [id, '', null];
					try {
						// process.send([id, '$resolve$', await fn(...args)]);
						const r = fn(...args);
						result[2] = await r;
						result[1] = '$resolve$';
					} catch (e) {
						// process.send([id, '$reject$', String(e)]);
						result[2] = String(e);
						result[1] = '$reject$';
					} finally {
						await globalThis.wmrssr.after(method, args, result);
						process.send(result);
					}
				});
				function reload() {
					mod = import(import.meta.url).then(m => mod = m);
				}
				hot.accept(reload);
				reload();
			})();
		`;
	}
	return { source };
	// return defaultGetSource(url, context, defaultGetSource);
}
