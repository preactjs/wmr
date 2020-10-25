import { h, Component } from 'preact';
import { useState, useRef } from 'preact/hooks';

export default function lazy(load) {
	let p, c;
	return props => {
		if (!p) p = load().then(m => ((c = (m && m.default) || m), 1));
		const [, update] = useState(0);
		const r = useRef(c);
		if (!r.current) r.current = p.then(update);
		if (c === undefined) throw p;
		return h(c, props);
	};
}

export class ErrorBoundary extends Component {
	componentDidCatch(e) {
		// if (this.__d) throw e;
		if (e && e.then) this.__d = true;
	}
	render(props) {
		return props.children;
	}
}
