export function x(y) {
	return (
		$$html`
			${Object.entries(y).map(([k, v]) => $$html`<li>
					${k}: ${v}
				</li>`)}
		`
	);
}
