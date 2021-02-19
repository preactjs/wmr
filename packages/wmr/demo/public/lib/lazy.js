import { h } from 'preact';
import { useState, useRef } from 'preact/hooks';

export default function lazy(load) {
	let p, c;
	function inner(props) {
		if (!p) p = load().then(m => ((c = (m && m.default) || m), 1));
		const [, update] = useState(0);
		const r = useRef(c);
		if (!r.current) r.current = p.then(update);
		if (c === undefined) throw p;
		inner._resolved = true;
		return h(c, props);
	}

	inner._resolved = false;

	return inner;
}

export function ErrorBoundary(props) {
	this.componentDidCatch = absorb;
	return props.children;
}
function absorb(err) {
	if (err && err.then) this.__d = true;
	else if (this.props.onError) this.props.onError(err);
}
