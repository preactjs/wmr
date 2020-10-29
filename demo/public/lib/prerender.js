// this should be provided by WMR or an npm module.

import { h, options, cloneElement } from 'preact';
import renderToString from 'preact-render-to-string';

let vnodeHook;

const old = options.vnode;
options.vnode = vnode => {
	if (old) old(vnode);
	if (vnodeHook) vnodeHook(vnode);
};

export async function prerender(vnode, data) {
	let tries = 0;
	if (typeof vnode === 'function') {
		vnode = h(vnode, data);
	} else if (data) {
		vnode = cloneElement(vnode, data);
	}
	const render = () => {
		if (++tries > 10) return;
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
		const html = await render();
		return { html, links };
	} finally {
		vnodeHook = null;
	}
}
