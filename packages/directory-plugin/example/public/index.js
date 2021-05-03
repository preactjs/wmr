import { LocationProvider, Router, lazy, ErrorBoundary, hydrate } from 'preact-iso';

import pages from 'dir:./pages';

// Generate a Route component and URL for each "page" module:
const routes = pages.map(name => ({
	Route: lazy(() => import(`./pages/${name}`)),
	url: '/' + name.replace(/(index)?\.\w+$/, '') // strip file extension and "index"
}));

function App() {
	return (
		<LocationProvider>
			<div class="app">
				<nav>
					<a href="/">Home</a>
					<a href="/about">About</a>
				</nav>
				<ErrorBoundary>
					<Router>
						{routes.map(({ Route, url }) => (
							<Route path={url} />
						))}
					</Router>
				</ErrorBoundary>
			</div>
		</LocationProvider>
	);
}

hydrate(<App />);

export async function prerender(data) {
	const { prerender: render } = await import('preact-iso');
	return await render(<App {...data} />);
}
