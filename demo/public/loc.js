import { h, createContext } from 'preact';
import { useContext, useMemo, useReducer, useEffect } from 'preact/hooks';

// console.log('hello 6');

const UPDATE = (state, url, push) => {
	if (url && url.type === 'click') {
		const link = url.target.closest('a[href]');
		if (!link || link.origin != location.origin) return state;
		url.preventDefault();
		push = true;
		url = link.href.replace(location.origin, '');
	} else if (typeof url !== 'string') url = location.pathname;
	if (push === true) history.pushState(null, null, url);
	else if (push === false) history.replaceState(null, null, url);
	return url;
};

export function Loc({ children }) {
	const [url, route] = useReducer(UPDATE, location.pathname);
	const value = useMemo(() => ({ url, route }), [url]);
	useEffect(() => {
		addEventListener('click', route);
		addEventListener('popstate', route);
		return () => {
			removeEventListener('click', route);
			removeEventListener('popstate', route);
		};
	});
	return h(Loc.ctx.Provider, { value }, children);
}

export const Router = (Loc.Router = ({ children }) => {
	const { url } = useLoc();
	children = [].concat(...children);
	let a = children.filter(c => c.props.path === url);
	if (a.length == 0) a = children.filter(c => c.props.default);
	return a;
});

Loc.ctx = createContext();

export const useLoc = () => useContext(Loc.ctx);
