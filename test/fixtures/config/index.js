import { render } from 'preact';
import styles from './style.module.css';

/** @template {(...any) => any} T @type {(f: T) => (...args: Parameters<T>) => ReturnType<T> extends PromiseLike<infer U> ? U : T} */
function lazy(render) {
	// @ts-ignore-next
	return function (...args) {
		if (this._prom && this.state.ret === this._prom) {
			this._prom = null;
			return (this._ret = this.state.c);
		}
		const ret = render.call(this, ...args);
		if (ret && ret.then) {
			this._prom = ret;
			ret.then(c => this._prom === ret && this.setState({ ret, c }));
			if (this._ret) return this._ret;
			throw ret;
		}
		this._prom = null;
		this._ret = ret;
		return ret;
	};
}

function App() {
	return (
		<div class="app">
			<h2>Weird Async Component Demo</h2>
			<ErrorBoundary>
				<Fetcher url="/" />
			</ErrorBoundary>
		</div>
	);
}

const Fetcher = lazy(async function Fetcher({ url }) {
	const res = await fetch(url);
	return (
		<pre class={styles.fetcher}>
			<h3>
				<code>GET {url}</code>
			</h3>
			{Array.from(res.headers.entries()).map(([k, v]) => (
				<dl class={styles.header}>
					<dt>{`${k}: `}</dt>
					<dd>{v}</dd>
				</dl>
			))}
			{'\n'}
			{await res.text()}
		</pre>
	);
});

class ErrorBoundary {
	componentDidCatch(e) {
		if (e && e.then) this.__d = true;
	}
	render(props) {
		return props.children;
	}
}

render(<App />, document.body);
