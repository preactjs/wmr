import { useState } from 'preact/hooks';

const SUPPORTS_LOCAL_STORAGE = typeof localStorage !== 'undefined';

/**
 * @type {<T>(name: string, value: T) => [T, (v: T) => void]}
 */
export function useLocalStorage(key, initial) {
	const [v, setValue] = useState(() => {
		const stored = SUPPORTS_LOCAL_STORAGE ? localStorage.getItem(key) : null;
		return stored === null ? initial : stored;
	});

	const set = v => {
		if (SUPPORTS_LOCAL_STORAGE) {
			localStorage.setItem(key, v);
		}
		setValue(v);
	};

	return [v, set];
}
