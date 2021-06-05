import Markup from '../components/markup.js';
import Sidebar from '../components/sidebar.js';
import Meta from '../components/meta.js';
import { useContent } from '../lib/use-content.js';
import { useRoute } from 'preact-iso';

export default function DocPage() {
	return (
		<div class="sidebar-layout">
			<Sidebar />
			<Doc />
		</div>
	);
}

function Doc() {
	const { params } = useRoute();
	const contentUrl = `content/docs/${params.slug || 'index'}`;
	const { html, meta } = useContent(contentUrl);

	return (
		<main class="main">
			<Meta {...meta} />
			<section class="md">
				<Markup html={html} />
			</section>
		</main>
	);
}
