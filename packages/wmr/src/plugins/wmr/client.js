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
let hasErrorOverlay = false;

const URL_SUFFIX = /\/(index\.html)?$/;

function handleMessage(e) {
	const data = JSON.parse(e.data);
	switch (data.type) {
		case 'reload':
			window.location.reload();
			break;
		case 'update':
			if (hasErrorOverlay) {
				hasErrorOverlay = false;
				const el = document.getElementById('wmr-error-overlay');
				if (el) el.remove();
			}
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
						clearTimeout(timeout);
					} catch (err) {}
				}, 1000);
			}
			break;
		case 'error': {
			errorCount++;
			hasErrorOverlay = true;
			createErrorOverlay(data);
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

/**
 * @type {<K extends keyof HTMLElementTagNameMap>(tag: K, attrs: any) => HTMLElementTagNameMap[K]}
 */
function createDom(tag, attrs) {
	const el = document.createElement(tag);
	for (const attr in attrs) {
		const value = attrs[attr];
		if (typeof value === 'function') {
			el.addEventListener(attr.slice(2), value);
		} else {
			el.setAttribute(attr, value);
		}
	}
	return el;
}

/**
 *
 * @param {{type: "error", error: string, codeFrame: string, stack: import('errorstacks').StackFrame[]}} data
 */
function createErrorOverlay(data) {
	const existing = document.getElementById('wmr-error-overlay');
	if (existing) existing.remove();

	const outer = createDom('div', { id: 'wmr-error-overlay' });
	const style = document.createElement('style');
	style.textContent = `
		#wmr-error-overlay {
			--bg: #fff;
			--bg-code-frame: rgb(255, 0, 32, 0.1);
			--bg-active-line: #fbcecc;
			--text: #222;
			--text2: #444;
			--title: #e84644;
			--code: #333;
			font-family: sans-serif;
			line-height: 1.4;
		}
		#wmr-error-overlay * {
			box-sizing: border-box;
		}
		
		@media (prefers-color-scheme: dark) {
			#wmr-error-overlay {
				--bg-code-frame: rgba(251, 93, 113, 0.2);
				--bg-active-line: #4f1919;
				--bg: #353535;
				--text: #f7f7f7;
				--text2: #ddd;
				--code: #fdd1d1;
			}
		}

		.wmr-error-container {
			position: fixed;
			top: 0;
			left: 0;
			right: 0;
			bottom: 0;
			z-index: 9999;
			color: var(--text);
			background: var(--bg);
		}

		.wmr-error-close {
			cursor: pointer;
			position: absolute;
			top: 1rem;
			right: 1rem;
		}

		.wmr-error-inner {
			max-width: 80ch;
			padding: 4rem 1rem;
			margin: 0 auto;
		}

		.wmr-error-title {
			color: var(--title);
			font-weight: normal;
			font-size: 1.5rem;
		}

		.wmr-error-code-frame {
			overflow: auto;
			padding: 0.5rem;
			background: var(--bg-code-frame);
			color: var(--code);
		}
		.wmr-error-line {
			padding: 0.25rem 0.5rem;
		}
		.wmr-error-active-line {
			display: inline-block;
			width: 100%;
			background: var(--bg-active-line);
		}

		.wmr-error-detail {
			cursor: pointer;
			color: var(--text2);
		}
		.wmr-error-stack-frame {
			padding: 0.5rem 0;
		}
		.wmr-error-stack-name {
			color: var(--text);
		}
		.wmr-error-stack-loc {
			color: var(--text2);
			font-family: monospace;
		}
	`;
	const overlay = createDom('div', { class: 'wmr-error-container' });
	const close = createDom('button', {
		class: 'wmr-error-close',
		onclick: () => {
			const dom = document.getElementById('wmr-error-overlay');
			if (dom) dom.remove();
		}
	});
	close.textContent = 'close';
	const inner = createDom('div', { class: 'wmr-error-inner' });
	overlay.append(close, inner);

	const title = createDom('h1', { class: 'wmr-error-title' });
	title.textContent = data.error;
	inner.append(title);

	const codeFrame = createDom('pre', { class: 'wmr-error-code-frame' });
	const code = createDom('code', {});
	codeFrame.append(code);

	data.codeFrame.split('\n').forEach((line, i, arr) => {
		const dom = createDom('span', { class: 'wmr-error-line' + (line.startsWith('>') ? ' wmr-error-active-line' : '') });
		dom.textContent = line;
		code.append(dom, i < arr.length - 1 ? '\n' : '');
	});
	inner.append(codeFrame);

	outer.append(style, overlay);

	const stackDetail = createDom('details', { class: 'wmr-error-detail' });
	const stackSummary = createDom('summary', {});
	stackSummary.textContent = `${data.stack.length} stack frames were collapsed.`;
	stackDetail.append(stackSummary);

	const frames = data.stack.map(frame => {
		const container = createDom('div', { class: 'wmr-error-stack-frame' });
		const name = createDom('div', { class: 'wmr-error-stack-name' });
		name.textContent = frame.name;
		const loc = createDom('div', { class: 'wmr-error-stack-loc' });
		loc.textContent = `${frame.fileName}:${frame.line}:${frame.column}`;

		container.append(name, loc);
		return container;
	});
	stackDetail.append(...frames);

	inner.append(stackDetail);

	document.body.appendChild(outer);
}
