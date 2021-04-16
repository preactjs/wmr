import { useState } from 'preact/hooks';

const SUPPORTS_LOCAL_STORAGE = typeof localStorage !== 'undefined';

function getItem(key) {
	if (SUPPORTS_LOCAL_STORAGE) {
		try {
			return localStorage.getItem(key);
		} catch (e) {}
	}
}

/**
 * @type {<T>(name: string, value: T, hydrateWithInitial: boolean) => [T, (v: T) => void]}
 */
export function useLocalStorage(key, initial, hydrateWithInitial) {
	const [v, setValue] = useState(() => {
		const stored = hydrateWithInitial ? null : getItem(key);
		return stored == null ? initial : stored;
	});
	
	useEffect(() => {
		if (hydrateWithInitial) {
			const stored = getItem(key);
			if (stored != null) setValue(stored);
		}
	}, []);

	const set = v => {
		if (SUPPORTS_LOCAL_STORAGE) {
			localStorage.setItem(key, v);
		}
		setValue(v);
	};

	return [v, set];
}
