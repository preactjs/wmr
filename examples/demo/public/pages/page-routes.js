import { routes } from 'wmr:fs-routes';

export function PageRoutes() {
	return (
		<ul>
			{routes.map(route => {
				const url = route.route.replace(/(:\w+)/g, (m, g) => {
					return 1;
				});
				return (
					<li key={route.route}>
						<a href={url}>{route.route}</a>
					</li>
				);
			})}
		</ul>
	);
}
