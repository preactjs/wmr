import Markup from './markup.js';
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
				<Feature title="Instant Server Startup">
					Fire up any project and start working immediately. The server is ready to respond in the blink of an eye!
				</Feature>
				<Feature title="Snappy HMR">
					Hot module reloading (=HMR) for modules, CSS and frameworks that stays fast, no matter how big your may
					project grow.
				</Feature>
				<Feature title="No entrys to configure">
					Just point WMR to HTML files and we'll do the rest.WMR automatically compiles any linked scripts or referenced
					assets.
				</Feature>
				<Feature title="Builtin TypeScript Support">
					Just point WMR to HTML files and we'll automatically compile any linked scripts.
				</Feature>
				<Feature title="Optimized production output">
					Just point WMR to HTML files and we'll automatically compile any linked scripts.
				</Feature>
				<Feature title="Rollup compatible plugin API">
					Just point WMR to HTML files and we'll automatically compile any linked scripts.
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
