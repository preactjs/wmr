import lazy, { ErrorBoundary } from 'preact-iso/lazy';
import { Router } from 'preact-iso/router';
import { styled } from 'goober';
import pages from 'dir:./docs';
import SideBar from './sideBar';

const routes = pages.map(name => ({
  Route: lazy(() => import(`./docs/${name}`)),
  url: '/docs' + name.replace(/(index)?\.\w+$/, '')
}));

const ContentWrapper = styled('div')`
	display: flex;
	& > :first-child {
		margin-right: 16px;
	}
`;

function Docs() {
  return (
		<ErrorBoundary>
			<ContentWrapper>
				<SideBar />
				<Router>
					{routes.map(({ Route, url }) => <Route path={url} />)}
				</Router>
			</ContentWrapper>
		</ErrorBoundary>
  );
}

export default Docs;
