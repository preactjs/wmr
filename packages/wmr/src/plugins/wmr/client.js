function log(...args) {
	// eslint-disable-next-line no-console
	console.info('[wmr] ', ...args);
}

const strip = url => url.replace(/[?&]t=\d+/g, '');
const addTimestamp = (url, time) => url + (/\?/.test(url) ? '&' : '?') + 't=' + time;

const resolve = url => new URL(url, location.origin).href;
let ws, connectTimer, connectDelay = 0;

/**
 * @param {boolean} [needsReload] Force page to reload once it's connected
 * to the server.
 */
function connect(needsReload) {
	ws = new WebSocket(location.origin.replace('http', 'ws') + '/_hmr', 'hmr');
	function sendSocketMessage(msg) {
		ws.send(JSON.stringify(msg));
	}

	clearTimeout(connectTimer);
	ws.addEventListener('open', () => {
		connectDelay = 0;
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
	ws.addEventListener('close', reconnect);
}

function reconnect() {
	connectDelay = Math.min(connectDelay * 2, 30000) || 500;
	connectTimer = setTimeout(() => {
		if (ws) ws.close();
		connect(false);
	}, connectDelay);
}

connect();

let errorCount = 0;
let errorOverlay;

const URL_SUFFIX = /\/(index\.html)?$/;

function handleMessage(e) {
	const data = JSON.parse(e.data);
	switch (data.type) {
		case 'reload':
			window.location.reload();
			break;
		case 'update':
			if (errorOverlay) {
				errorOverlay.remove();
				errorOverlay = null;
			}
			data.changes.forEach(url => {
				url = resolve(url);
				if (!mods.get(url)) {
					if (/\.(css|s[ac]ss)$/.test(url)) {
						if (mods.has(url + '?module')) {
							url += '?module';
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
							if (el[p] && strip(resolve(el[p])) === url) el[p] = addTimestamp(strip(el[p]), Date.now());
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
			errorOverlay = createErrorOverlay(data);
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
	const newUrl = addTimestamp(url, date);
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
		node.href = addTimestamp(filename, Date.now());
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
			sheets[i].ownerNode.href = addTimestamp(strip(url), Date.now());
			return true;
		}

		const found = traverseSheet(sheets[i], url);
		if (found) {
			const index = [].indexOf.call(found.parentStyleSheet.rules, found);
			const urlStr = JSON.stringify(addTimestamp(strip(url), Date.now()));
			const css = found.cssText.replace(/^(@import|@use)\s*(?:url\([^)]*\)|(['"]).*?\2)/, '$1 ' + urlStr);
			found.parentStyleSheet.insertRule(css, index);
			found.parentStyleSheet.deleteRule(index + 1);
			return true;
		}
	}
}

// Listen for iframe close events

/**
 *
 * @param {{type: "error", error: string, codeFrame: string, stack: import('errorstacks').StackFrame[]}} data
 */
function createErrorOverlay(data) {
	if (errorOverlay) errorOverlay.remove();

	const iframe = document.createElement('iframe');
	iframe.style.cssText = `position: fixed; top: 0; left: 0; bottom: 0; right: 0; z-index: 99999; width: 100%; height: 100%; border: none;`;

	iframe.addEventListener('load', () => {
		const doc = iframe.contentDocument;

		/**
		 * @param {string} tag
		 * @param {Record<string, any> | null} props
		 * @param {any[]} children
		 * @returns {HTMLElement}
		 */
		function h(tag, props, ...children) {
			props = props || {};
			tag = tag.replace(/([.#])([^.#]+)/g, (s, g, i) => ((props[g == '.' ? 'className' : 'id'] = i), ''));
			const el = Object.assign(doc.createElement(tag), props);
			el.append(...children);
			return el;
		}

		const STYLE = `
		:root {
			--bg: #fff;
			--bg-code-frame: rgb(255, 0, 32, 0.1);
			--bg-active-line: #fbcecc;
			--text: #222;
			--text2: #444;
			--title: #e84644;
			--code: #333;
			font-family: sans-serif;
			line-height: 1.4;
			color: var(--text);
			background: var(--bg);
		}

		* {
			box-sizing: border-box;
		}

		@media (prefers-color-scheme: dark) {
			:root {
				--bg-code-frame: rgba(251, 93, 113, 0.2);
				--bg-active-line: #4f1919;
				--bg: #353535;
				--text: #f7f7f7;
				--text2: #ddd;
				--code: #fdd1d1;
			}
		}

		.close {
			cursor: pointer;
			position: absolute;
			top: 1rem;
			right: 1rem;
		}

		.inner {
			max-width: 48rem;
			padding: 4rem 1rem;
			margin: 0 auto;
		}

		.title {
			color: var(--title);
			font-weight: normal;
			font-size: 1.5rem;
		}

		.code-frame {
			overflow: auto;
			padding: 0.5rem;
			background: var(--bg-code-frame);
			color: var(--code);
		}
		.line {
			padding: 0.25rem 0.5rem;
		}
		.active-line {
			display: inline-block;
			width: 100%;
			background: var(--bg-active-line);
		}

		.detail {
			cursor: pointer;
			color: var(--text2);
		}
		.stack-frame {
			padding: 0.5rem 0;
		}
		.stack-name {
			color: var(--text);
		}
		.stack-loc {
			color: var(--text2);
			font-family: monospace;
		}
		`;

		const lines = data.codeFrame.split('\n').reduce((lines, line, i, arr) => {
			lines.push(
				h(
					'span',
					{
						className: 'line' + (line.startsWith('>') ? ' active-line' : '')
					},
					line
				)
			);
			if (i < arr.length - 1) lines.push('\n');
			return lines;
		}, /** @type {any} */ ([]));

		const frames = data.stack.map(frame =>
			h(
				'div.stack-frame',
				null,
				h('div.stack-name', null, frame.name),
				h('div.stack-loc', null, `${frame.fileName}:${frame.line}:${frame.column}`)
			)
		);

		doc.body.append(
			h(
				'div#wmr-error-overlay',
				null,
				h('style', null, STYLE),
				h(
					'div',
					null,
					h(
						'button.close',
						{
							onclick() {
								errorOverlay.remove();
								errorOverlay = null;
							}
						},
						'close'
					),
					h(
						'div.inner',
						null,
						h('h1.title', null, String(data.error)),
						h('pre.code-frame', null, h('code', null, ...lines)),
						h(
							'details.detail',
							null,
							h('summary', null, `${data.stack.length} stack frames were collapsed.`),
							...frames
						)
					)
				)
			)
		);
	});

	document.body.appendChild(iframe);
	return iframe;
}
