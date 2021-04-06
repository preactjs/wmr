import { useLocation } from 'preact-iso';
import { SlotContent } from '../lib/slots.js';

export default function Sidebar({ content }) {
	const { path } = useLocation();

	return (
		<SlotContent name="sidebar">
			<aside class="sidebar" tabIndex="0">
				<nav aria-label="secondary">
					<h3 class="sidebar-title">Prologue</h3>
					{content.map(page => {
						const url = `/docs/${page.name}`.replace(/(^|\/)index$/g, '');
						const current = url === path;
						return (
							<a href={url} class="sidebar-nav-link" data-active={current}>
								{page.nav || page.title}
							</a>
						);
					})}
				</nav>
			</aside>
		</SlotContent>
	);
}
