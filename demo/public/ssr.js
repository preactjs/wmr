import renderToString from 'preact-render-to-string';
import prepass from 'preact-ssr-prepass';

export async function ssr(req) {
	const { Document } = await import('./document.tsx');
	const vnode = <Document req={req} />;
	await prepass(vnode);
	return renderToString(vnode, {}, { pretty: true });
}
