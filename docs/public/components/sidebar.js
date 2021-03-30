import { useLocation } from 'preact-iso';

export default function Sidebar({ content }) {
	const { path } = useLocation();

	return (
		<aside class="sidebar">
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
				<h3 class="sidebar-title">Advanced</h3>
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
	);
}
