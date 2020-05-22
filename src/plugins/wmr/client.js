import Sockette from 'sockette';

function log(...args) {
	console.info('[wmr] ', ...args);
}

let errorCount = 0;

function updateStyleSheet(url) {
	const sheets = document.styleSheets;
	for (let i = 0; i < sheets.length; i++) {
		if (strip(sheets[i].href) === url) {
			sheets[i].ownerNode.href = strip(url) + '?t=' + Date.now();
			return true;
		}
	}
}

new Sockette(location.origin.replace('http', 'ws') + '/_hmr', {
	onmessage(e) {
		const data = JSON.parse(e.data);
		switch (data.type) {
			case 'update':
				data.changes.forEach(url => {
					url = resolve(url);

					if (!mods.get(url)) {
						const isCss = /\.css$/.test(url);
						if (isCss && mods.has(url + '.js')) {
							url += '.js';
						} else if (isCss && updateStyleSheet(url)) {
							return;
						} else {
							return location.reload();
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
								try {
									// console.clear();
								} catch (e) {}
							}
						});
				});
				break;
			case 'error':
				errorCount++;
				console.error(data.error);
				// if (typeof data.error === 'string') {
				// 	let err = data.error.replace(/ \(([^(]+):(\d+):(\d+)\)/, (s, file, line, col) => {
				// 		return ` (${file}:${line}:${col})`;
				// 	});
				// 	console.error(err);
				// } else {
				// 	console.error(data.error);
				// }
				break;
			default:
				log('unknown message: ', data);
		}
	},
	// onopen(e) { log('connected'); },
	// onreconnect(e) { log('reconnecting...'); },
	// onclose(e) { log('disconnected'); },
	onerror() {
		log('connection error');
	}
});

const strip = url => url.replace(/\?t=\d+/g, '');

const resolve = url => new URL(url, location.origin).href;

function update(url) {
	const mod = getMod(url);
	const dispose = Array.from(mod.dispose);
	const accept = Array.from(mod.accept);
	const newUrl = url + '?t=' + Date.now();
	const p = mod.import ? mod.import(newUrl) : import(newUrl);
	return p.then(m => {
		// accept.forEach(c => (c({ module: m }), mod.accept.delete(c)));
		// dispose.forEach(c => (c(), mod.dispose.delete(c)));
		accept.forEach(c => c({ module: m }));
		dispose.forEach(c => c());
	});
}
const updateQueue = [];
let updating = false;
function dequeue() {
	if (!updateQueue.length) {
		return (updating = false);
	}
	updating = true;
	return update(updateQueue.shift()).then(dequeue, dequeue);
}

const styles = new Map();
export function style(filename, id) {
	id = resolve(id || filename);
	let node = styles.get(id);
	if (node) {
		node.href = filename;
	} else {
		const node = document.createElement('link');
		node.rel = 'stylesheet';
		node.href = filename;
		document.head.appendChild(node);
		styles.set(id, node);
	}
}

const mods = new Map();
function getMod(url) {
	url = strip(url);
	let mod = mods.get(url);
	if (!mod) mods.set(url, (mod = { accept: new Set(), dispose: new Set() }));
	return mod;
}

export function createHotContext(url) {
	const mod = getMod(url);
	return {
		// accept(...args) {
		// 	const fn = args.pop();
		// 	if (args[0]) getMod(args[0]).accept.add(fn);
		// 	else mod.accept.add(fn);
		// },
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
