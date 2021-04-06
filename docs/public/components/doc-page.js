import Markup from '../components/markup.js';
import Sidebar from '../components/sidebar.js';
import Meta from '../components/meta.js';
import { useContent } from '../lib/use-content.js';
import content from 'content:../content/docs';

export default function DocPage({ slug }) {
	// normalize `/index`:
	for (let doc of content) if (doc.name.replace(/(^|\/)index$/g, '') === slug) slug = doc.name;

	return (
		<div class="sidebar-layout">
			<Sidebar content={content} />
			<Doc slug={slug} />
		</div>
	);
}

function Doc({ slug }) {
	const { html, meta } = useContent(`content/docs/${slug}`);
	return (
		<main class="main">
			<Meta {...meta} />
			<section class="md">
				<Markup html={html} />
			</section>
		</main>
	);
}
