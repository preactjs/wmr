/**
 * Export preconfigured routes for preact-iso
 * @returns {import('wmr').Plugin}
 */
export default function fsRoutesPreactPlugin() {
	const PUBLIC = 'builtins:fs-routes-preact';
	const INTERNAL = '\0builtins:fs-routes-preact';
	return {
		name: 'fs-routes-preact',
		resolveId(id) {
			if (id === PUBLIC) {
				return INTERNAL;
			}
		},
		async load(id) {
			if (id !== INTERNAL) return;

			return `import { routes as rawRoutes } from 'builtins:fs-routes';
import lazy from 'preact-iso/lazy';
import { h } from 'preact';
import { Route } from 'preact-iso/router';

export const routes = rawRoutes.map(route => {
	return h(Route,  { path: route.route, component: lazy(route.load) });
});`;
		}
	};
}
