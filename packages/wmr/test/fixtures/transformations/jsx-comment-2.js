export default function ContentRegion({ content, ...props }) {
	const hasNav = !!(props.next || props.prev);
	return (
		<content-region name={props.name} data-page-nav={hasNav}>
			{content && (
				<Markup
					// key={content}
					markup={content}
					type="html"
					trim={false}
					components={COMPONENTS}
				/>
			)}
			{hasNav && (
				<div class={style.nextWrapper}>
					{props.prev ? <SiblingNav start lang={props.lang} route={props.prev} /> : <span />}
					{props.next ? <SiblingNav lang={props.lang} route={props.next} /> : <span />}
				</div>
			)}
		</content-region>
	);
}
