import { h, render } from 'preact';
import { LocationProvider as Loc, Router } from './lib/loc.js';
import lazy, { ErrorBoundary } from './lib/lazy.js';
import Home from './pages/home.js';
// import About from './pages/about/index.js';
import NotFound from './pages/_404.js';
import Header from './header.tsx';
// import './style.css';

const About = lazy(() => import('./pages/about/index.js'));
const CompatPage = lazy(() => import('./pages/compat.js'));
const ClassFields = lazy(() => import('./pages/class-fields.js'));
const Files = lazy(() => import('./pages/files/index.js'));
const Environment = lazy(async () => (await import('./pages/environment/index.js')).Environment);

export function App() {
	return (
		<Loc>
			<div class="app">
				<Header />
				<ErrorBoundary>
					<Router>
						<Home path="/" />
						<About path="/about" />
						<CompatPage path="/compat" />
						<ClassFields path="/class-fields" />
						<Files path="/files" />
						<Environment path="/env" />
						<NotFound default />
					</Router>
				</ErrorBoundary>
			</div>
		</Loc>
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
