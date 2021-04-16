import { h, options } from 'preact';
import { useState, useRef } from 'preact/hooks';

export default function lazy(load) {
	let p, c;
	return props => {
		const [, update] = useState(0);
		const r = useRef(c);
		if (!p) p = load().then(m => (c = (m && m.default) || m));
		if (c !== undefined) return h(c, props);
		if (!r.current) r.current = p.then(() => update(1));
		throw p;
	};
}

// See https://github.com/preactjs/preact/blob/88680e91ec0d5fc29d38554a3e122b10824636b6/compat/src/suspense.js#L5
const oldCatchError = options.__e;
options.__e = (err, newVNode, oldVNode) => {
	if (err && err.then) {
		let v = newVNode;
		while ((v = v.__)) {
			if (v.__c && v.__c.__c) {
				if (newVNode.__e == null) {
					newVNode.__e = oldVNode.__e; // ._dom
					newVNode.__k = oldVNode.__k; // ._children
				}
				if (!newVNode.__k) newVNode.__k = [];
				return v.__c.__c(err, newVNode);
			}
		}
	}
	if (oldCatchError) oldCatchError(err, newVNode, oldVNode);
};

export function ErrorBoundary(props) {
	this.__c = childDidSuspend;
	this.componentDidCatch = props.onError;
	return props.children;
}

function childDidSuspend(err) {
	err.then(Object).then(this.forceUpdate.bind(this));
}
