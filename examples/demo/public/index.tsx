import { LocationProvider, Router } from './lib/loc.js';
import lazy, { ErrorBoundary } from './lib/lazy.js';
import hydrate from './lib/hydrate';
import Home from './pages/home.js';
// import About from './pages/about/index.js';
import NotFound from './pages/_404.js';
import Header from './header.tsx';
// import './style.css';

const About = lazy(() => import('./pages/about/index.js'));
const LazyAndLate = lazy(
	() =>
		new Promise(r => {
			setTimeout(() => {
				r(import('./pages/about/index.js'));
			}, 1.5e3);
		})
);
const CompatPage = lazy(() => import('./pages/compat.js'));
const ClassFields = lazy(() => import('./pages/class-fields.js'));
const Files = lazy(() => import('./pages/files/index.js'));
const Environment = lazy(async () => (await import('./pages/environment/index.js')).Environment);
const JSONView = lazy(async () => (await import('./pages/json.js')).JSONView);
const Alias = lazy(async () => await import('./pages/alias.js'));

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
						<Alias path="/alias" />
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
	const { prerender } = await import('./lib/prerender.js');
	return await prerender(<App {...data} />);
}

// @ts-ignore
if (module.hot) module.hot.accept(u => hydrate(<u.module.App />, document.body));
