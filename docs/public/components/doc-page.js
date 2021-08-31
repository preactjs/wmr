import Markup from '../components/markup.js';
import Sidebar from '../components/sidebar.js';
import Meta from '../components/meta.js';
import { useContent } from '../lib/use-content.js';
import { useRoute } from 'preact-iso';
import { getNextPage, getPreviousPage } from './doc-structure.js';

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
	const slug = params.slug || 'index';
	const contentUrl = `content/docs/${slug}`;
	const { html, meta } = useContent(contentUrl);

	const prevPage = getPreviousPage(slug);
	const nextPage = getNextPage(slug);

	return (
		<div class="main">
			<Meta {...meta} />
			<section class="md">
				<Markup html={html} />
			</section>
			<section class="container pagination">
				<div>
					{prevPage && (
						<a href={prevPage.slug} class="pagination-link">
							<img src="/assets/arrow.svg" alt="" class="icon" width="24" height="24" />
							<span class="pagination-text">{prevPage.nav || prevPage.title}</span>
						</a>
					)}
				</div>
				<div>
					{nextPage && (
						<a href={nextPage.slug} class="pagination-link">
							<span class="pagination-text">{nextPage.nav || nextPage.title}</span>
							<img src="/assets/arrow.svg" alt="" class="icon flip-y" width="24" height="24" />
						</a>
					)}
				</div>
			</section>
		</div>
	);
}
