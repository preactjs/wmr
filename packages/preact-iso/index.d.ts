import { VNode } from 'preact';
import { PrerenderOptions } from './prerender';

export default function prerender(vnode: VNode, options?: PrerenderOptions): { html: string, links: Set<string>};
