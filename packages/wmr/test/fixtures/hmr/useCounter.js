import { useState } from 'preact/hooks';

export default function useCounter() {
	const [count, setCount] = useState(0);
	return [count, () => setCount(count + 1)];
}
