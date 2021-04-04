import { ErrorBoundary, hydrate, LocationProvider, Router } from 'preact-iso';
import { useCallback } from 'preact/hooks';
import { Slot } from './lib/slots.js';
import Home from './components/home-page.js';
import Docs from './components/doc-page.js';
import Header from './components/header.js';
import './styles/prism.css';

export function App() {
	const loaded = useCallback(() => {
		self.page.focus();
	}, []);

	return (
		<ErrorBoundary>
			<LocationProvider>
				<Header />
				<main tabIndex="0" id="page">
					<Router onLoadEnd={loaded}>
						<Home path="/" />
						<Docs path="/docs/:slug*" />
					</Router>
					<Slot name="sidebar" />
				</main>
			</LocationProvider>
		</ErrorBoundary>
	);
}

hydrate(<App />);

export async function prerender(data) {
	return (await import('./prerender.js')).prerender(<App {...data} />);
}
