import hydrate from 'preact-iso/hydrate';
import { LocationProvider, Router } from 'preact-iso/router';
import lazy, { ErrorBoundary } from 'preact-iso/lazy';

import pages from 'ls:./pages';

// Generate a Route component and URL for each "page" module:
const routes = pages.map(name => ({
  Route: lazy(() => import(`./pages/${name}`)),
  url: '/' + name.replace(/(index)?\.\w+$/, '')  // strip file extension and "index"
}));

console.log({ pages, routes });

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
            {routes.map(({ Route, url }) => <Route path={url} />)}
          </Router>
        </ErrorBoundary>
      </div>
    </LocationProvider>
  );
}

hydrate(<App />);

export async function prerender(data) {
  const { default: prerender } = await import('preact-iso/prerender');
  return await prerender(<App {...data} />);
}
