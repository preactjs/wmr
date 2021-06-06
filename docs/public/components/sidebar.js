import { useLocation } from 'preact-iso';
import { SlotContent } from '../lib/slots.js';
import { content } from './doc-structure.js';

export default function Sidebar() {
	const { path } = useLocation();

	return (
		<SlotContent name="sidebar">
			<aside class="sidebar" tabIndex={0}>
				<nav aria-label="secondary">
					{content.map(item => {
						if (item.heading) {
							return <h3 class="sidebar-title">{item.heading}</h3>;
						}

						return (
							<a key={item.name} href={item.slug} class="sidebar-nav-link" data-active={item.slug === path}>
								{item.nav || item.title}
							</a>
						);
					})}
				</nav>
			</aside>
		</SlotContent>
	);
}
