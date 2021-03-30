import { useState } from 'preact/hooks';

/**
 * @type {<T>(name: string, value: T) => [T, (v: T) => void]}
 */
export function useLocalStorage(key, initial) {
	const [v, setValue] = useState(() => {
		const stored = localStorage.getItem(key);
		return stored === null ? initial : stored;
	});

	const set = v => {
		localStorage.setItem(key, v);
		setValue(v);
	};

	return [v, set];
}
