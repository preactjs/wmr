import { h } from 'preact';
import { useState, useRef } from 'preact/hooks';

export default function lazy(load) {
	let p, c;
	function inner(props) {
		if (!p) p = load().then(m => (c = (m && m.default) || m));
		const [, update] = useState(0);
		const r = useRef(c);
		if (!r.current) r.current = p.then(() => update(1));
		if (c === undefined) throw p;
		inner._r = true;
		return h(c, props);
	}

	inner._r = false;

	return inner;
}

export function ErrorBoundary(props) {
	this.componentDidCatch = absorb;
	return props.children;
}

function absorb(err) {
	if (err && err.then) this.__d = true;
	// @ts-ignore
	else if (this.props.onError) this.props.onError(err);
}
