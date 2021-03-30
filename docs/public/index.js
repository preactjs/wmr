import { ErrorBoundary, hydrate, LocationProvider, Router } from 'preact-iso';
import Home from './components/home-page.js';
import Docs from './components/doc-page.js';
import Header from './components/header.js';
import './styles/markdown.scss';
import './styles/prism.css';

export function App() {
	return (
		<ErrorBoundary>
			<LocationProvider>
				<Header />
				<main>
					<Router>
						<Home path="/" />
						<Docs path="/docs/:slug*" />
					</Router>
				</main>
			</LocationProvider>
		</ErrorBoundary>
	);
}

hydrate(<App />);

export async function prerender(data) {
	return (await import('./prerender.js')).prerender(<App {...data} />);
}
