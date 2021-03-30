import Markup from '../components/markup.js';
import Sidebar from '../components/sidebar.js';
import Meta from '../components/meta.js';
import { useContent } from '../lib/use-content.js';
import content from 'content:../content/docs';

export default function Docs({ slug }) {
	// normalize `/index`:
	for (let doc of content) if (doc.name.replace(/(^|\/)index$/g, '') === slug) slug = doc.name;

	const { html, meta } = useContent(`content/docs/${slug}`);

	return (
		<>
			<Meta {...meta} />
			<div class="sidebar-layout">
				<Sidebar content={content} />
				<main class="main">
					<section class="md">
						<Markup html={html} />
					</section>
				</main>
			</div>
		</>
	);
}
