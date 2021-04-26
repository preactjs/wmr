import { LocationProvider, Router, lazy, ErrorBoundary, hydrate } from 'preact-iso';
import Home from './pages/home.js';
// import About from './pages/about/index.js';
import NotFound from './pages/_404.js';
import Header from './header.tsx';
import { PageRoutes } from './pages/page-routes.js';
// import './style.css';
import { routes } from 'builtins:fs-routes';

console.log(routes);
const pageRoutes = routes.map(route => {
	const Comp = lazy(route.load);
	return (
		<Route path={route.route}>
			<Comp />
		</Route>
	);
});

const sleep = t => new Promise(r => setTimeout(r, t));

const IS_CLIENT = typeof window !== 'undefined';

const About = lazy(() => import('./pages/about/index.js'));
const LazyAndLate = lazy(async () => (IS_CLIENT && (await sleep(1500)), import('./pages/about/index.js')));
const CompatPage = lazy(() => import('./pages/compat.js'));
const ClassFields = lazy(async () => (IS_CLIENT && (await sleep(1500)), import('./pages/class-fields.js')));
const Files = lazy(() => import('./pages/files/index.js'));
const Environment = lazy(async () => (await import('./pages/environment/index.js')).Environment);
const JSONView = lazy(async () => (await import('./pages/json.js')).JSONView);
const MetaTags = lazy(async () => (await import('./pages/meta-tags.js')).MetaTags);
const AliasOutside = lazy(async () => await import('./pages/alias-outside.js'));

function showLoading() {
	document.body.classList.add('loading');
}
function hideLoading() {
	document.body.classList.remove('loading');
}

export function App() {
	console.log(pageRoutes);
	return (
		<LocationProvider>
			<div class="app">
				<Header />
				<ErrorBoundary>
					<Router onLoadStart={showLoading} onLoadEnd={hideLoading}>
						<Home path="/" />
						<About path="/about" />
						<LazyAndLate path="/lazy-and-late" title={'Lazy and Late'} />
						<CompatPage path="/compat" />
						<ClassFields path="/class-fields" />
						<Files path="/files" />
						<Environment path="/env" />
						<JSONView path="/json" />
						<MetaTags path="/meta-tags" />
						<AliasOutside path="/alias-outside" />
						<PageRoutes path="/fs-routes" />
						{pageRoutes}
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
	return (await import('./prerender.js')).prerender(<App {...data} />);
}

// @ts-ignore
if (module.hot) module.hot.accept(u => hydrate(<u.module.App />, document.body));
