import { h, createContext, cloneElement } from 'preact';
import { useContext, useMemo, useReducer, useEffect } from 'preact/hooks';

// console.log('hello 6');

const UPDATE = (state, url, push) => {
	if (url && url.type === 'click') {
		const link = url.target.closest('a[href]');
		if (!link || link.origin != location.origin) return state;
		url.preventDefault();
		push = true;
		url = link.href.replace(location.origin, '');
	} else if (typeof url !== 'string') url = location.pathname + location.search;
	if (push === true) history.pushState(null, null, url);
	else if (push === false) history.replaceState(null, null, url);
	return url;
};

export function Loc(props) {
	const [url, route] = useReducer(UPDATE, location.pathname + location.search);
	const value = useMemo(() => {
		// const [, path, query] = url.match(/^([^?]+?)(\?.*)$/);
		// return { url, path, query: Object.fromEntries(new URLSearchParams(query)), route };
		const u = new URL(url, location.origin);
		return { url, path: u.pathname, query: Object.fromEntries(u.searchParams), route };
	}, [url]);
	useEffect(() => {
		addEventListener('click', route);
		addEventListener('popstate', route);
		return () => {
			removeEventListener('click', route);
			removeEventListener('popstate', route);
		};
	});
	return h(Loc.ctx.Provider, { value }, props.children);
}

export const Router = (Loc.Router = props => {
	const { path, query } = useLoc();
	const children = [].concat(...props.children);
	let a = children.filter(c => c.props.path === path);
	if (a.length == 0) a = children.filter(c => c.props.default);
	// @TODO: this is probably unnecessary, since anyone can just use `useLoc().query`?
	return a.map(p => cloneElement(p, { path, query }));
});

Loc.ctx = createContext();

export const useLoc = () => useContext(Loc.ctx);
