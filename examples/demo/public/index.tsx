import { LocationProvider, Router } from 'preact-iso/router';
import lazy, { ErrorBoundary } from 'preact-iso/lazy';
import hydrate from 'preact-iso/hydrate';
import Home from './pages/home.js';
// import About from './pages/about/index.js';
import NotFound from './pages/_404.js';
import Header from './header.tsx';
// import './style.css';

const sleep = t => new Promise(r => setTimeout(r, t));

const About = lazy(() => import('./pages/about/index.js'));
const LazyAndLate = lazy(async () => (await sleep(1500), import('./pages/about/index.js')));
const CompatPage = lazy(() => import('./pages/compat.js'));
const ClassFields = lazy(async () => (await sleep(1500), import('./pages/class-fields.js')));
const Files = lazy(() => import('./pages/files/index.js'));
const Environment = lazy(async () => (await import('./pages/environment/index.js')).Environment);
const JSONView = lazy(async () => (await import('./pages/json.js')).JSONView);

export function App() {
	return (
		<LocationProvider>
			<div class="app">
				<Header />
				<ErrorBoundary>
					<Router>
						<Home path="/" />
						<About path="/about" />
						<LazyAndLate path="/lazy-and-late" title={'Lazy and Late'} />
						<CompatPage path="/compat" />
						<ClassFields path="/class-fields" />
						<Files path="/files" />
						<Environment path="/env" />
						<JSONView path="/json" />
						<NotFound default />
					</Router>
				</ErrorBoundary>
			</div>
		</LocationProvider>
	);
}

if (typeof window !== 'undefined') {
	hydrate(<App />, document.body);
}

export async function prerender(data) {
	const { default: render } = await import('preact-iso/prerender');
	return await render(<App {...data} />);
}

// @ts-ignore
if (module.hot) module.hot.accept(u => hydrate(<u.module.App />, document.body));
