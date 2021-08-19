import { builtinModules } from 'module';
import { join } from 'path';
import { statSync, readFileSync } from 'fs';
import { URL, pathToFileURL, fileURLToPath } from 'url';
import { get as getHttp } from 'http';
import { get as getHttps } from 'https';

/*global globalThis*/

const cwd = pathToFileURL(`${process.cwd()}/`).href;
let root = cwd;
try {
	if (statSync(join(process.cwd(), 'public')).isDirectory()) {
		root = pathToFileURL(`${process.cwd()}/public`).href;
	}
} catch (e) {}

let baseURL = process.env.WMRSSR_HOST || `http://0.0.0.0:${process.env.PORT || 8080}`;
globalThis.baseURL = baseURL;

/** Tracks the module graph as imports are resolved */
// TODO: maybe we should share the module-graph of wmr-middleware here
const GRAPH = {
	modules: new Map(),
	pendingModules: 0,
	values() {
		return this.modules.values();
	},
	hasModule(url) {
		return this.modules.has(url);
	},
	getModule(url, type) {
		let mod = this.modules.get(url);
		if (mod) return mod;
		mod = {
			type: type || 'script',
			url,
			imports: [],
			dynamicImports: [],
			completed: false
		};
		this.modules.set(url, mod);
		return mod;
	},
	addDependency(url, type, importer) {
		this.getModule(url, type);
		const parent = this.getModule(importer);
		const group = parent.completed ? parent.dynamicImports : parent.imports;
		if (!group.includes(url)) group.push(url);
	},
	resolveStaticDependencies(resources) {
		const seen = new Set();
		for (const entry of resources) seen.add(entry.url);
		for (const entry of resources) {
			const meta = this.modules.get(entry.url);
			if (!meta) continue;
			for (const dep of meta.imports) {
				const depMeta = this.modules.get(dep);
				if (seen.has(dep)) continue;
				seen.add(dep);
				resources.push(depMeta);
			}
		}
	}
};

// gross: expose module graph data for use in the injected scripts
globalThis._GRAPH = GRAPH;

/**
 * To keep things a little cleaner, specifier URLs are relative to the WMR host.
 * http://localhost:8080/foo.js --> /foo.js
 */
function relativizeUrlSpecifier(url) {
	if (url.startsWith(baseURL)) return url.slice(baseURL.length);
	return url;
}

const isBuiltIn = specifier =>
	specifier.startsWith('node:') || specifier.startsWith('nodejs:') || builtinModules.includes(specifier);

// Node 15 switched from `nodejs:fs` to `node:fs` as a scheme for for built-in modules, so we detect it.
// @ts-ignore-next
const prefix = import('node:fs')
	.then(() => 'node:')
	.catch(() => 'nodejs:');

const HTTP_CACHE = new Map();

// We track the entry module (and any hot updates to it) in order to inject HMR code:
let isFirstResolve = true;
let firstUrl;

export function getGlobalPreloadCode() {
	return readFileSync(fileURLToPath(new URL('./ssr-environment.js', import.meta.url).href), 'utf-8');
}

export async function resolve(specifier, context, defaultResolve) {
	// Exempt built-in modules from custom resolution:
	const pfx = await prefix;
	if (specifier.startsWith('/@node/')) {
		return { url: pfx + specifier.slice(7) };
	}

	if (specifier.startsWith('/@npm/') && isBuiltIn(specifier.slice(6))) {
		return { url: pfx + specifier.slice(6) };
	}

	// Use the default strategy for data: URLs
	if (specifier.startsWith('data:')) return { url: specifier };

	// Strip any cwd from (entry) module filename:
	if (specifier.startsWith(root)) specifier = specifier.slice(root.length);

	const url = new URL(specifier, context.parentURL || baseURL).href;
	const relativeUrl = relativizeUrlSpecifier(url).replace(/\?t=\d+/g, '');
	const parentUrl = relativizeUrlSpecifier(context.parentURL || baseURL).replace(/\?t=\d+/g, '');

	// Track in-flight resolves
	if (!GRAPH.hasModule(relativeUrl)) GRAPH.pendingModules++;
	// Register module and parent->child connection in the graph
	GRAPH.addDependency(relativeUrl, 'script', parentUrl);
	// Associate this module with the current SSR pass
	if (globalThis.wmrssr) globalThis.wmrssr.collect('script', relativeUrl);

	// Resolve the module over HTTP:
	const res = await fetch(url);
	const resolvedUrl = res.url || url;
	HTTP_CACHE.set(resolvedUrl, res);
	return { url: resolvedUrl };
}

export function getFormat(url, context, defaultGetFormat) {
	if (isBuiltIn(url)) return { format: 'builtin' };

	// In our world, everything is a module:
	return { format: 'module' };
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

	GRAPH.pendingModules--;

	const spec = relativizeUrlSpecifier(url);

	// If we're loading source code for a module, that means we're done scanning its parent module's imports.
	// We use this to mark the parent as `completed`, which causes future imports to be considered dynamicImports.
	for (const m of GRAPH.values()) {
		if (m.imports.includes(spec)) {
			m.completed = true;
			// console.log(`Marking ${m.url.replace(baseURL, '')} as complete because a child is being loaded`);
		}
	}

	// We've generally already fetched modules at this point as part of resolution.
	const res = HTTP_CACHE.get(url) || (await fetch(url));
	let source = await res.text();
	if (res.status === 404) throw Error(`Module ${spec} not found`);
	if (!res.ok) throw Error(spec + ': ' + res.status + '\n' + source);

	// Inject SSR variant of the `style(url, id)` helper into the WMR runtime:
	if (new URL(url).pathname === '/_wmr.js') {
		// This is a little funky, but bear with me.
		// Instead of injecting imported stylesheets, we register them in the module graph.
		// The sheet's parent/importer module is obtained by inspecting the call stack from style(),
		// which is always the parent module's program body (`import{style}from'/_wmr.js';style("x.css")`).
		source += `
			style = function(url, id) {
				const line = new Error().stack.split('\\n')[2];
				const index = line.indexOf(${JSON.stringify(baseURL)});
				if (index !== -1) {
					const p = line.substring(index + ${baseURL.length}).replace(/\\:\\d+\\:\\d+$/g, '');
					globalThis._GRAPH.addDependency(url, 'style', p);
				}
				globalThis.wmrssr.collect('style', url, id);
			};
		`;
	}

	// Inject HMR into the entry module (any any replacement hot updates of that module):
	if (isFirstResolve) firstUrl = url;
	isFirstResolve = false;
	if (url.replace(/\?t=\d+/g, '') === firstUrl) {
		source += `
			import { createHotContext as $$$cc } from '/_wmr.js';
			(hot => {
				hot.prepare(() => globalThis.wmrssr.setMod());
				hot.accept(({ module }) => globalThis.wmrssr.setMod(module));
				import(import.meta.url).then(m => globalThis.wmrssr.setMod(m));
			})($$$cc(import.meta.url));
		`;
	}

	return { source };
}

// Helpers

function fetch(url) {
	return new Promise((resolve, reject) => {
		console.log(url);
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
				ok: (res.statusCode || 0) < 400,
				status: res.statusCode,
				text: () => text
			});
		}).once('error', reject);
	});
}
