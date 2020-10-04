/* eslint-disable import/extensions */
import { name as jsName } from './js/foo';
import { name as jsxName } from './jsx/foo';
import { name as tsName } from './ts/foo';
import { name as tsxName } from './tsx/foo';
import { name as indexJsName } from './index-js';
import { name as indexJsxName } from './index-jsx';
import { name as indexTsName } from './index-ts';
import { name as indexTsxName } from './index-tsx';
import lazy from '../../lazy.js';

const LazyJs = lazy(() => import('./js/foo'));
const LazyJsx = lazy(() => import('./jsx/foo'));
const LazyTs = lazy(() => import('./ts/foo'));
const LazyTsx = lazy(() => import('./tsx/foo'));
const LazyIndexJs = lazy(() => import('./index-js'));
const LazyIndexJsx = lazy(() => import('./index-jsx'));
const LazyIndexTs = lazy(() => import('./index-ts'));
const LazyIndexTsx = lazy(() => import('./index-tsx'));

export default function NodeResolve() {
	return (
		<div style="padding: 2rem;">
			<h1>Node resolution</h1>
			<p>Static:</p>
			<ul>
				<li>/js/foo -&gt; {jsName}</li>
				<li>/jsx/foo -&gt; {jsxName}</li>
				<li>/ts/foo -&gt; {tsName}</li>
				<li>/tsx/foo -&gt; {tsxName}</li>
				<li>/index-js -&gt; {indexJsName}</li>
				<li>/index-jsx -&gt; {indexJsxName}</li>
				<li>/index-ts -&gt; {indexTsName}</li>
				<li>/index-tsx -&gt; {indexTsxName}</li>
			</ul>

			<p>Dynamic:</p>
			<ul>
				<li>
					/js/foo -&gt; <LazyJs />
				</li>
				<li>
					/jsx/foo -&gt; <LazyJsx />
				</li>
				<li>
					/ts/foo -&gt; <LazyTs />
				</li>
				<li>
					/tsx/foo -&gt; <LazyTsx />
				</li>
				<li>
					/index-js -&gt; <LazyIndexJs />
				</li>
				<li>
					/index-jsx -&gt; <LazyIndexJsx />
				</li>
				<li>
					/index-ts -&gt; <LazyIndexTs />
				</li>
				<li>
					/index-tsx -&gt; <LazyIndexTsx />
				</li>
			</ul>
		</div>
	);
}
