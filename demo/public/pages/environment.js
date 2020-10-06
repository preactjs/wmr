import { foo } from './foo.js';

export function Environment() {
	return (
		<table>
			<thead>
				<tr>
					<th>Name {foo}</th>
					<th>Value</th>
				</tr>
			</thead>
			<tbody>
				{Object.keys(process.env)
					.sort()
					.map(key => {
						return (
							<tr key={key}>
								<td>{key}</td>
								<td>{String(process.env[key])}</td>
							</tr>
						);
					})}
			</tbody>
		</table>
	);
}
