export { Router, LocationProvider, useLocation } from './router.js';
export { default as lazy, ErrorBoundary } from './lazy.js';
export { default as hydrate } from './hydrate.js';

export function prerender(vnode, options) {
	return import('./prerender.js').then(m => m.default(vnode, options));
}
