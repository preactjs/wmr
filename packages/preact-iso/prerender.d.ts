import { VNode } from 'preact';

export interface PrerenderOptions {
	maxDepth?: number;
	props?: Record<string, unknown>;
}

export default function prerender(
	vnode: VNode,
	options?: PrerenderOptions
): Promise<{ html: string; links: Set<string> }>;
