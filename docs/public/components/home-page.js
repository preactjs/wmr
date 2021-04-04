// import Markup from './markup.js';
import Meta from './meta.js';
import Jumbotron from './jumbotron.js';
import { useContent } from '../lib/use-content.js';
import homeContent from 'markdown:../content/index.md';

/**
 *
 * @param {{title: string, children: string}} props
 * @returns
 */
function Feature(props) {
	return (
		<div class="feature">
			<h3 class="feature-title">{props.title}</h3>
			<p>{props.children}</p>
		</div>
	);
}

export default function Home() {
	const { html, meta } = useContent(homeContent);

	return (
		<div>
			<Meta {...meta} />
			<Jumbotron />
			<div class="feature-grid">
				<Feature title="Instant startup">
					Fire up any project and start working immediately. The server is ready to respond in the blink of an eye!
				</Feature>
				<Feature title="Snappy HMR">
					Hot reloading for modules, CSS and frameworks that stays fast as your project grows.
				</Feature>
				<Feature title="No config needed">
					Start WMR in a directory with HTML files and we'll do the rest, automatically handling linked scripts and
					referenced assets.
				</Feature>
				<Feature title="TypeScript built-in">
					WMR supports TypeScript out of the box, leaving type checking to your editor and tests.
				</Feature>
				<Feature title="Optimized for production">
					WMR builds your app for production using Rollup, automatically crawling and prerendering pages to static HTML.
				</Feature>
				<Feature title="Rollup-compatible API">
					WMR supports Rollup's plugin API, so you can bring your existing plugins and knowledge with you.
				</Feature>
			</div>
			<div class="md">{/* <Markup html={html} /> */}</div>
			<div class="container">
				<code>
					npm init create-wmr my-project <button>clip</button>
				</code>
			</div>
		</div>
	);
}
