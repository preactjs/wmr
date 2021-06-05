import { useLocation } from 'preact-iso';
import { SlotContent } from '../lib/slots.js';
import { docPages, docStructure } from './doc-structure.js';

export default function Sidebar() {
	const { path } = useLocation();

	return (
		<SlotContent name="sidebar">
			<aside class="sidebar" tabIndex="0">
				<nav aria-label="secondary">
					{docStructure.map(item => {
						if (item.type === 'heading') {
							return <h3 class="sidebar-title">{item.name}</h3>;
						}

						const page = docPages.get(item.name);

						return (
							<a key={page.name} href={page.slug} class="sidebar-nav-link" data-active={page.slug === path}>
								{page.nav || page.title}
							</a>
						);
					})}
				</nav>
			</aside>
		</SlotContent>
	);
}
