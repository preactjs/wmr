import pages from 'dir:./docs';
import lazy, { ErrorBoundary } from 'preact-iso/lazy';
import { Router } from 'preact-iso/router';

const routes = pages.map(name => ({
  Route: lazy(() => import(`./docs/${name}`)),
  url: '/docs' + name.replace(/(index)?\.\w+$/, '')
}));

console.log()

function Docs() {
  return (
		<ErrorBoundary>
			<Router>
				{routes.map(({ Route, url }) => <Route path={url} />)}
			</Router>
		</ErrorBoundary>
  );
}

export default Docs;
