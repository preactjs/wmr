/**
 * Export preconfigured routes for preact-iso
 * @returns {import('wmr').Plugin}
 */
export default function fsRoutesPreactPlugin() {
	const PUBLIC = 'wmr:fs-routes-preact';
	const INTERNAL = '\0wmr:fs-routes-preact';
	return {
		name: 'fs-routes-preact',
		resolveId(id) {
			if (id === PUBLIC) {
				return INTERNAL;
			}
		},
		async load(id) {
			if (id !== INTERNAL) return;

			return `import { routes as rawRoutes } from 'wmr:fs-routes';
import { lazy, Route } from 'preact-iso';
import { h } from 'preact';

export const routes = rawRoutes.map(route => {
	return h(Route,  { path: route.route, component: lazy(route.load) });
});`;
		}
	};
}
