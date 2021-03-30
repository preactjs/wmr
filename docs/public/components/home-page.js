import Markup from './markup.js';
import Meta from './meta.js';
import Jumbotron from './jumbotron.js';
import { useContent } from '../lib/use-content.js';
import homeContent from 'markdown:../content/index.md';

export default function Home() {
	const { html, meta } = useContent(homeContent);

	return (
		<section class="fullwidth">
			<Meta {...meta} />
			<Jumbotron />
			<div class="md">
				<Markup html={html} />
			</div>
		</section>
	);
}
