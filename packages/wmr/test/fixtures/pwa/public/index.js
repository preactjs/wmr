import { render } from 'preact';
import Home from './home.js';

export function App() {
	return (
		<div class="app">
			<header>
				<nav>
					<a href="/">Home</a>
				</nav>
			</header>
			<Home />
		</div>
	);
}

render(<App />, document.body);

navigator.serviceWorker.register('/sw.js');

// @ts-ignore
if (module.hot) module.hot.accept(u => render(<u.module.App />, document.body));
