export function x(y) {
	return (
		<>
			{Object.entries(y).map(([k, v]) => (
				<li>
					{k}: {v}
				</li>
			))}
		</>
	);
}
