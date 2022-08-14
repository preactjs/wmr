import { h, options, cloneElement } from 'preact';
import renderToString from 'preact-render-to-string';

let vnodeHook;
let initialized = false;

const old = options.vnode;
options.vnode = vnode => {
	if (old) old(vnode);
	if (vnodeHook) vnodeHook(vnode);
};

async function init() {
	const fs = (await eval('u=>import(u)')('fs')).promises;
	// eslint-disable-next-line no-undef
	globalThis.fetch = async url => {
		const text = () => fs.readFile('dist/' + String(url).replace(/^\//, ''), 'utf-8');
		return { text, json: () => text().then(JSON.parse) };
	};
}

/**
 * @param {ReturnType<h>} vnode The root JSX element to render (eg: `<App />`)
 * @param {object} [options]
 * @param {number} [options.maxDepth = 10] The maximum number of nested asynchronous operations to wait for before flushing
 * @param {object} [options.props] Additional props to merge into the root JSX element
 */
export default async function prerender(vnode, options) {
	options = options || {};

	if (!initialized) {
		initialized = true;
		await init();
	}

	const maxDepth = options.maxDepth || 10;
	const props = options.props;
	let tries = 0;

	if (typeof vnode === 'function') {
		vnode = h(vnode, props);
	} else if (props) {
		vnode = cloneElement(vnode, props);
	}

	const render = () => {
		if (++tries > maxDepth) return;
		try {
			return renderToString(vnode);
		} catch (e) {
			if (e && e.then) return e.then(render);
			throw e;
		}
	};

	let links = new Set();
	vnodeHook = ({ type, props }) => {
		if (type === 'a' && props && props.href && (!props.target || props.target === '_self')) {
			links.add(props.href);
		}
	};

	try {
		let html = await render();
		html += `<script type="isodata"></script>`;
		return { html, links };
	} finally {
		vnodeHook = null;
	}
}
