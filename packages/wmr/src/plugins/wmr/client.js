function log(...args) {
	console.info('[wmr] ', ...args);
}

const strip = url => url.replace(/\?t=\d+/g, '');

const resolve = url => new URL(url, location.origin).href;
let ws;

/**
 * @param {boolean} [needsReload] Force page to reload once it's connected
 * to the server.
 */
function connect(needsReload) {
	ws = new WebSocket(location.origin.replace('http', 'ws') + '/_hmr', 'hmr');
	function sendSocketMessage(msg) {
		ws.send(JSON.stringify(msg));
	}

	ws.addEventListener('open', () => {
		log(`Connected to server.`);
		if (needsReload) {
			window.location.reload();
		} else {
			queue.forEach(sendSocketMessage);
			queue = [];
		}
	});

	ws.addEventListener('message', handleMessage);
	ws.addEventListener('error', handleError);
}

connect();

let errorCount = 0;

const URL_SUFFIX = /\/(index\.html)?$/;

function handleMessage(e) {
	const data = JSON.parse(e.data);
	switch (data.type) {
		case 'reload':
			window.location.reload();
			break;
		case 'update':
			data.changes.forEach(url => {
				url = resolve(url);
				if (!mods.get(url)) {
					if (/\.(css|s[ac]ss)$/.test(url)) {
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
				if (!updating) {
					dequeue(Date.now()).then(() => {
						if (errorId === errorCount) {
							// try {
							// 	console.clear();
							// } catch (e) {}
						}
					});
				}
			});
			break;
		case 'info':
			log(data.message);

			if (data.kind === 'restart') {
				let timeout = setTimeout(() => {
					try {
						connect(true);
						log(`Connected to server.`);
						clearTimeout(timeout);
					} catch (err) {}
				}, 1000);
			}
			break;
		case 'error': {
			errorCount++;
			let msg = data.error;
			if (data.codeFrame) {
				msg += '\n' + data.codeFrame;
			}
			console.error(msg);
			break;
		}
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
function dequeue(date) {
	updating = updateQueue.length !== 0;
	return (
		updating &&
		update(updateQueue.shift(), date).then(
			() => dequeue(date),
			() => dequeue(date)
		)
	);
}

function update(url, date) {
	const mod = getMod(url);
	const dispose = Array.from(mod.dispose);
	const accept = Array.from(mod.accept);
	const newUrl = url + '?t=' + date;
	const p = mod.import ? mod.import(newUrl) : import(newUrl);

	return p
		.then(m => {
			accept.forEach(c => (c({ module: m }), mod.accept.delete(c)));
			dispose.forEach(c => (c(), mod.dispose.delete(c)));
			// accept.forEach(c => c({ module: m }));
			// dispose.forEach(c => c());
		})
		.catch(err => {
			console.error(err);
		});
}

const mods = new Map();
function getMod(url) {
	url = strip(url);
	let mod = mods.get(url);
	if (!mod) mods.set(url, (mod = { accept: new Set(), dispose: new Set() }));
	return mod;
}

let queue = [];

// HMR API
export function createHotContext(url) {
	const mod = getMod(url);
	return {
		accept(fn) {
			if (!ws || ws.readyState !== ws.OPEN) {
				queue.push({ id: url.replace(location.origin, ''), type: 'hotAccepted' });
			} else {
				ws.send(JSON.stringify({ id: url.replace(location.origin, ''), type: 'hotAccepted' }));
			}

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

function traverseSheet(sheet, target) {
	for (let i = 0; i < sheet.rules.length; i++) {
		if (sheet.rules[i].href && resolve(strip(sheet.rules[i].href)) === strip(target)) {
			return sheet.rules[i];
		} else if (sheet.rules[i].styleSheet) {
			return traverseSheet(sheet.rules[i].styleSheet, target);
		}
	}
}

// Update a non-imported stylesheet
function updateStyleSheet(url) {
	const sheets = document.styleSheets;

	for (let i = 0; i < sheets.length; i++) {
		if (sheets[i].href && strip(sheets[i].href) === url) {
			// @ts-ignore
			sheets[i].ownerNode.href = strip(url) + '?t=' + Date.now();
			return true;
		}

		const found = traverseSheet(sheets[i], url);
		if (found) {
			const index = [].indexOf.call(found.parentStyleSheet.rules, found);
			const urlStr = JSON.stringify(strip(url) + '?t=' + Date.now());
			const css = found.cssText.replace(/^(@import|@use)\s*(?:url\([^)]*\)|(['"]).*?\2)/, '$1 ' + urlStr);
			found.parentStyleSheet.insertRule(css, index);
			found.parentStyleSheet.deleteRule(index + 1);
			return true;
		}
	}
}
