import { h } from 'preact';
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

export function ErrorBoundary(props) {
	this.componentDidCatch = absorb;
	this._childDidSuspend = Object;
	return props.children;
}

function absorb(err) {
	if (err && err.then) this.__d = true;
	// @ts-ignore
	else if (this.props.onError) this.props.onError(err);
}
