import { LocationProvider, Router } from 'preact-iso/router';
import lazy, { ErrorBoundary } from 'preact-iso/lazy';
import { toStatic } from 'hoofd/preact';
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
const MetaTags = lazy(async () => (await import('./pages/meta-tags.js')).MetaTags);

function showLoading() {
	document.body.classList.add('loading');
}
function hideLoading() {
	document.body.classList.remove('loading');
}

export function App() {
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
	const res = await render(<App {...data} />);

	const head = toStatic();
	const elements = new Set([
		...head.links.map(props => ({ type: 'link', props })),
		...head.metas.map(props => ({ type: 'meta', props })),
		...head.scripts.map(props => ({ type: 'script', props }))
	]);

	return {
		...res,
		data: {
			hello: 'world',
		},
		head: {
			title: head.title,
			lang: head.lang,
			elements
		}
	};
}

// @ts-ignore
if (module.hot) module.hot.accept(u => hydrate(<u.module.App />, document.body));
