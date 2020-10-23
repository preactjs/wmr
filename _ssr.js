import { join } from 'path';
import { statSync } from 'fs';
import { URL, pathToFileURL, fileURLToPath } from 'url';
import { get as getHttp } from 'http';
import { get as getHttps } from 'https';
import { fork } from 'child_process';
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
		// console.log({
		// 	file: process.argv[2],
		// 	path: fileURLToPath(new URL('./' + process.argv[2], root)),
		// 	root,
		// 	cwd
		// });

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
		ssr.on('message', data => {
			console.log('parent message: ', data);
			if (data === 'init') {
				ssr.send([++c, { url: '/' }]);
			} else {
				console.log(data);
			}
		});

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

console.log(process.env.WMRSSR_HOST, process.argv);

// console.log(root);

export function getGlobalPreloadCode() {
	const loc = new URL(baseURL);
	let location = {};
	for (let i in loc) {
		try {
			if (typeof loc[i] === 'string') {
				location[i] = String(loc[i]);
			}
		} catch (e) {}
	}
	return `
		const require = getBuiltin('module').createRequire(process.cwd());
		globalThis.WebSocket = require('ws');
		globalThis.self = globalThis;
		globalThis.location = ${JSON.stringify(location)};
	`;
}

let first = true;
export async function resolve(specifier, context, defaultResolve) {
	// console.log(specifier, process.argv[1]);
	if (specifier.startsWith(root)) {
		// console.log(specifier, specifier.slice(root.length));
		specifier = specifier.slice(root.length);
	}
	const url = new URL(specifier, context.parentURL || baseURL).href;
	// console.log('RESOLVE', specifier, context.parentURL, url);
	const res = await fetch(url);
	const resolvedUrl = res.url || url;
	CACHE.set(resolvedUrl, res);
	return { url: resolvedUrl };
	// return { url };
	// return defaultResolve(specifier, context, defaultResolve);
}

export function getFormat(url, context, defaultGetFormat) {
	// console.log('GET FORMAT', url);
	return {
		format: 'module'
	};
	// return defaultGetFormat(url, context, defaultGetFormat);
}

export async function getSource(url, context, defaultGetSource) {
	// console.log('GET SOURCE', url);
	const spec = url.replace(baseURL, '');
	// const res = await fetch(url);
	const res = CACHE.get(url) || (await fetch(url));
	let source = await res.text();
	if (res.status === 404) throw Error(`Module ${spec} not found`);
	if (!res.ok) throw Error(spec + ': ' + res.status + '\n' + source);
	if (first) {
		// console.log('first', globalThis.location);
		first = false;
		source += `
			import { createHotContext as $$$cc } from '/_wmr.js';
			(function() {
				const hot = $$$cc(import.meta.url);
				let ssr;
				process.send('init');
				process.on('message', async ([id, data]) => {
					let s = await ssr;
					console.log("got message", id, data);
					try {
						process.send([id, 1, await s(data)]);
					} catch (e) {
						process.send([id, 0, String(e)]);
					}
				});
				function reload() {
					ssr = import(import.meta.url).then(m => {
						ssr = m.ssr || m.default;
						return ssr;
					});
				}
				hot.accept(reload);
				reload();
			})();
		`;
	}
	return { source };
	// return defaultGetSource(url, context, defaultGetSource);
}
