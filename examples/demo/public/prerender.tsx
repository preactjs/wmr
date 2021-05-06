import { prerender as ssr } from 'preact-iso';
import { toStatic } from 'hoofd/preact';

export async function prerender(vnode: any) {
	const res = await ssr(vnode);

	const head = toStatic();
	const elements = new Set([
		...head.links.map(props => ({ type: 'link', props })),
		...head.metas.map(props => ({ type: 'meta', props })),
		...head.scripts.map(props => ({ type: 'script', props }))
	]);

	return {
		...res,
		data: {
			hello: 'world'
		},
		head: {
			title: head.title,
			lang: head.lang,
			elements
		}
	};
}
