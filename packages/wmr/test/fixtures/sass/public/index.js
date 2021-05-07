import { h, render } from 'preact';
import styles from './style.module.scss';
const Home = lazy(() => import('./home/index.js'));
const Profile = lazy(() => import('./profile/index.js'));

/** @template T @type {(load:()=>Promise<{default:T}|T>)=>T} */
function lazy(load) {
	let c, p;
	//@ts-ignore
	return function (props) {
		if (c) return h(c, props);
		if (!p) p = load().then(e => (c = (e && e.default) || e));
		if (!this.lz) this.lz = p.then(c => this.setState({ c }));
	};
}

export function App() {
	const url = location.pathname;
	return (
		<div class={styles.app}>
			<header>
				<nav>
					<a href="/">Home</a>
					<a href="/profile/foo">Profile</a>
				</nav>
			</header>
			{'/' === url && <Home />}
			{url.startsWith('/profile') && <Profile username={url.split('/')[2]} />}
		</div>
	);
}

render(<App />, document.body);
