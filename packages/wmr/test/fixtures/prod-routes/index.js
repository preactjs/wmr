import { h, render } from 'preact';
import { LocationProvider, Router, lazy, ErrorBoundary } from 'preact-iso';
import NotFound from './_404.js';
import Header from './header.js';

const About = lazy(() => import('./about.js'));

const Home = () => <p>Home</p>;

export function App() {
	return (
		<LocationProvider>
			<div class="app">
				<Header />
				<ErrorBoundary>
					<Router>
						<Home path="/" />
						<About path="/about" />
						<NotFound default />
					</Router>
				</ErrorBoundary>
			</div>
		</LocationProvider>
	);
}

if (typeof window !== 'undefined') {
	render(<App />, document.body);
}

export async function prerender(data) {
	const { prerender } = await import('./lib/prerender.js');
	return await prerender(<App {...data} />);
}

// @ts-ignore
if (module.hot) module.hot.accept(u => render(<u.module.App />, document.body));
