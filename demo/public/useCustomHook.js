import { useState } from 'preact/hooks';

export function useCounter() {
	const [state, setState] = useState(2);
	return [state, () => setState(state + 2)];
}
