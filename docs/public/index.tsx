import { h, render } from 'preact';

import { LocationProvider, Router } from 'preact-iso/router';
import { ErrorBoundary } from 'preact-iso/lazy';

import { extractCss, setup, styled } from 'goober';
import { prefix } from 'goober/prefixer';

import Home from './pages/home.tsx';
import Docs from './pages/docs.tsx';
import Header from './header.tsx';
import { GlobalStyles } from './GlobalStyles';

setup(h, prefix);

const Main = styled('div')`
	padding: 0 64px;
`;

export function App() {
	return (
		<LocationProvider>
			<GlobalStyles />
			<Header />
			<ErrorBoundary>
				<Main>
					<Router>
						<Home path="/" />
						<Docs path="/docs" />
						<Docs path="/docs/:name" />
					</Router>
				</Main>
			</ErrorBoundary>
		</LocationProvider>
	);
}

render(<App />, document.body);

export async function prerender(data) {
	const { default: prerender } = await import('preact-iso/prerender');
	const res = await prerender(<App {...data} />);
	const css = extractCss();

	res.html = `<style id="_goober"> ${css}</style>${res.html}`;

	return res;
}

// @ts-ignore
if (module.hot) module.hot.accept(u => render(<u.module.App />, document.body));
