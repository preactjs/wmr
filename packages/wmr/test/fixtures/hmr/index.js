import { render } from 'preact';
import styles from './style.module.css';
import Home from './home.js';

export function App() {
	return (
		<main class={styles.app}>
			<header>
				<nav>
					<a href="/">Home</a>
				</nav>
			</header>
			<Home />
		</main>
	);
}

render(<App />, document.body);

// @ts-ignore
if (module.hot) module.hot.accept(u => render(<u.module.App />, document.body));
