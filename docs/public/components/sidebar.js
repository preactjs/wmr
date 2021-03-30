import { useLocation } from 'preact-iso';

export default function Sidebar({ content }) {
	const { path } = useLocation();

	return (
		<aside class="sidebar">
			<ul>
				{content.map(page => {
					const url = `/docs/${page.name}`.replace(/(^|\/)index$/g, '');
					const current = url === path;
					return (
						<li>
							<a href={url} class={current ? 'current' : ''}>
								{page.nav || page.title}
							</a>
						</li>
					);
				})}
			</ul>
		</aside>
	);
}
