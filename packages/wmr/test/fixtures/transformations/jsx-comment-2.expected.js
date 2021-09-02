import { html as $$html } from '/@npm/htm/preact';
export default function ContentRegion({ content, ...props }) {
	const hasNav = !!(props.next || props.prev);
	return (
		$$html`<content-region name=${props.name} data-page-nav=${hasNav}>
			${content && (
				$$html`<${Markup}
					markup=${content}
					type="html"
					trim=${false}
					components=${COMPONENTS}
				/>`
			)}
			${hasNav && (
				$$html`<div class=${style.nextWrapper}>
					${props.prev ? $$html`<${SiblingNav} start lang=${props.lang} route=${props.prev} />` : $$html`<span />`}
					${props.next ? $$html`<${SiblingNav} lang=${props.lang} route=${props.next} />` : $$html`<span />`}
				</div>`
			)}
		</content-region>`
	);
}
