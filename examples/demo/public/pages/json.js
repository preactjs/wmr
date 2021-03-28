import { useEffect, useState } from 'preact/hooks';
import json from './foo.json';

export function JSONView() {
	const [fetched, setFetched] = useState(null);

	useEffect(() => {
		fetch('./pages/foo.json')
			.then(r => r.json())
			.then(r => setFetched(r));
	}, []);

	return (
		<div>
			<p>import: {JSON.stringify(json)}</p>
			<p>fetch: {JSON.stringify(fetched)}</p>
		</div>
	);
}
