function log(...args) {
	console.info('[wmr] ', ...args);
}

const strip = url => url.replace(/\?t=\d+/g, '');

const resolve = url => new URL(url, location.origin).href;

let ws;
function connect() {
	// Pared-down inline version of https://github.com/lukeed/sockette <3
	ws = new WebSocket(location.origin.replace('http', 'ws') + '/_hmr');
	ws.onmessage = handleMessage;
	ws.onerror = handleError;
}

setTimeout(connect);

let errorCount = 0;

const URL_SUFFIX = /\/(index\.html)?$/;

function handleMessage(e) {
	const data = JSON.parse(e.data);

	switch (data.type) {
		case 'update':
			data.changes.forEach(url => {
				url = resolve(url);

				if (!mods.get(url)) {
					if (/\.css$/.test(url)) {
						if (mods.has(url + '.js')) {
							url += '.js';
						} else {
							updateStyleSheet(url);
							return;
						}
					} else if (url.replace(URL_SUFFIX, '') === resolve(location.pathname).replace(URL_SUFFIX, '')) {
						return location.reload();
					} else {
						for (const el of document.querySelectorAll('[src],[href]')) {
							// @ts-ignore-next
							const p = el.src ? 'src' : 'href';
							if (el[p] && strip(resolve(el[p])) === url) el[p] = strip(el[p]) + '?t=' + Date.now();
						}
						return;
					}
				}

				// ignore already-pending updates (but not in-flight updates):
				if (updateQueue.indexOf(url) < 1) {
					updateQueue.push(url);
				}
				const errorId = errorCount;
				if (!updating)
					dequeue().then(() => {
						if (errorId === errorCount) {
							// try {
							// 	console.clear();
							// } catch (e) {}
						}
					});
			});
			break;
		case 'error':
			errorCount++;
			console.error(data.error);
			break;
		default:
			log('unknown message: ', data);
	}
}

function handleError(e) {
	if (e && e.code === 'ECONNREFUSED') {
		setTimeout(connect, 1000);
	}
	log('connection error', e);
}

// HMR updates are queued uniquely and run in sequence
const updateQueue = [];
let updating = false;
function dequeue() {
	updating = updateQueue.length !== 0;
	if (updating) {
		const promiseLike = update(updateQueue.shift());
		if (Array.isArray) {
			return Promise.all(promiseLike).then(dequeue, dequeue);
		}
		return promiseLike.then(dequeue, dequeue);
	}
}

function update(url, visited = new Set()) {
	const mod = getMod(url);
	const dispose = Array.from(mod.dispose);
	const accept = Array.from(mod.accept);
	const newUrl = url + '?t=' + Date.now();

	if (!accept.length) {
		const { dependents } = mod;
		const promises = [];
		if (dependents.size) {
			for (const dependent of dependents) {
				if (!visited.has(dependent)) {
					visited.add(dependent);
					promises.push(update(dependent, visited));
				}
			}
			return promises;
		}
		// We can't bubble up
		window.location.reload();
	} else {
		const p = mod.import ? mod.import(newUrl) : import(newUrl);
		return p
			.then(m => {
				accept.forEach(c => (c({ module: m }), mod.accept.delete(c)));
				dispose.forEach(c => (c(), mod.dispose.delete(c)));
			})
			.catch(err => {
				console.error(err);
			});
	}
}

const mods = new Map();
function getMod(url) {
	url = strip(url);
	let mod = mods.get(url);
	if (!mod)
		mods.set(url, (mod = { dependencies: new Set(), dependents: new Set(), accept: new Set(), dispose: new Set() }));
	return mod;
}

// HMR API
export function createHotContext(url, dependencies) {
	const mod = getMod(url);
	if (dependencies) {
		for (const dep of dependencies) {
			mod.dependencies.add(resolve(dep));
			const dependentMod = getMod(resolve(dep));
			dependentMod.dependents.add(url);
		}
	}

	return {
		accept(fn) {
			mod.accept.add(fn);
		},
		dispose(fn) {
			mod.dispose.add(fn);
		},
		invalidate() {
			location.reload();
		}
	};
}

// CSS HMR API (for sheets imported via proxy modules)
const styles = new Map();
export function style(filename, id) {
	id = resolve(id || filename);
	let node = styles.get(id);
	if (node) {
		node.href = filename + '?t=' + Date.now();
	} else {
		const node = document.createElement('link');
		node.rel = 'stylesheet';
		node.href = filename;
		document.head.appendChild(node);
		styles.set(id, node);
	}
}

// Update a non-imported stylesheet
function updateStyleSheet(url) {
	const sheets = document.styleSheets;
	for (let i = 0; i < sheets.length; i++) {
		if (strip(sheets[i].href) === url) {
			// @ts-ignore
			sheets[i].ownerNode.href = strip(url) + '?t=' + Date.now();
			return true;
		}
	}
}
