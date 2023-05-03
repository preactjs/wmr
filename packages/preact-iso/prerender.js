import { h, options, cloneElement } from 'preact';
import renderToString from 'preact-render-to-string';

let vnodeHook;

const old = options.vnode;
options.vnode = vnode => {
	if (old) old(vnode);
	if (vnodeHook) vnodeHook(vnode);
};

/**
 * @param {ReturnType<h>} vnode The root JSX element to render (eg: `<App />`)
 * @param {object} [options]
 * @param {number} [options.maxDepth = 10] The maximum number of nested asynchronous operations to wait for before flushing
 * @param {object} [options.props] Additional props to merge into the root JSX element
 * @param {boolean} [options.throwOnFailure] Controls if an exception should be thrown in case rendering fails
 */
export default async function prerender(vnode, options) {
	options = options || {};

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
		if (typeof html !== "string") {
			if (options.throwOnFailure) {
				throw new Error(`Pre-rendering failed! render() evaluated to: ${html}`);
			} else {
				html = "";
			}
		}
		html += `<script type="isodata"></script>`;
		return { html, links };
	} finally {
		vnodeHook = null;
	}
}
