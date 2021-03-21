import lazy, { ErrorBoundary } from 'preact-iso/lazy';
import { Router } from 'preact-iso/router';
import { styled } from 'goober';
// import pages from 'dir:./docs';
import SideBar from './sideBar';

const GettingStarted = lazy(() => import(`./docs/index.js`))
const Plugins = lazy(() => import(`./docs/plugins.js`))
// const routes = pages.map(name => ({
//   Route: lazy(() => import(`./docs/${name.replace(/\.js/g,'')}.js`)),
//   url: '/docs/' + name.replace(/(index)?\.\w+$/, '')
// }));

const ContentWrapper = styled('div')`
	display: flex;
	& > :first-child {
		margin-right: 32px;
	}
`;

function Docs() {
  return (
		<ErrorBoundary>
			<ContentWrapper>
				<SideBar />
				<Router>
					<GettingStarted path="/docs" />
					<Plugins path="/docs/plugins" />
					{/* routes.map(({ Route, url }) => <Route path={url} />) */}
				</Router>
			</ContentWrapper>
		</ErrorBoundary>
  );
}

export default Docs;
