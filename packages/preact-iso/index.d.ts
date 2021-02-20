import { VNode } from 'preact';
import { PrerenderOptions } from './prerender';

export { Router, LocationProvider, useLoc, useLocation } from './router';
export { default as lazy, ErrorBoundary } from './lazy';
export { default as hydrate } from './hydrate';

export default function prerender(
	vnode: VNode,
	options?: PrerenderOptions
): Promise<{ html: string; links: Set<string> }>;
