import { h } from 'preact';
import { useState } from 'preact/hooks';
import { withHydration } from './with-hydration';

export const Hydratable = withHydration({ specifier: 'Hydratable', importUrl: import.meta.url })(
	function HydratableComp(props) {
		const [count, setCount] = useState(0);
		return (
			<div>
				<p>Another Hydratable only on About:</p>
				<div style={{ display: 'flex' }}>
					<button type="button" onClick={() => setCount(count - 1)}>
						-
					</button>
					Count: {count}
					<button type="button" onClick={() => setCount(count + 1)}>
						+
					</button>
				</div>
				<p>SSR: {typeof document === 'undefined' ? 'yes' : 'no'}</p>
				<p>Props in component: {JSON.stringify(props, null, 2)} </p>
			</div>
		);
	}
);
