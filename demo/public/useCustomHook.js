import { useState } from 'preact/hooks';

export function useCounter() {
	const [state, setState] = useState(0);
	return [state, setState(state + 1)];
}
