import { h, createContext, cloneElement } from 'preact';
import { useContext, useMemo, useReducer, useEffect, useLayoutEffect, useRef } from 'preact/hooks';

let push;
const UPDATE = (state, url) => {
	push = undefined;
	if (url && url.type === 'click') {
		const link = url.target.closest('a[href]');
		if (!link || link.origin != location.origin || !/^(_?self)?$/i.test(link.target)) return state;

		push = true;
		url.preventDefault();
		url = link.href.replace(location.origin, '');
	} else if (typeof url === 'string') {
		push = true;
	} else {
		url = location.pathname + location.search;
	}

	if (push === true) history.pushState(null, '', url);
	else if (push === false) history.replaceState(null, '', url);
	return url;
};

export const exec = (url, route, matches) => {
	url = url.split('/').filter(Boolean);
	route = (route || '').split('/').filter(Boolean);
	for (let i = 0, val; i < Math.max(url.length, route.length); i++) {
		let [, m, param, flag] = (route[i] || '').match(/^(:?)(.*?)([+*?]?)$/);
		val = url[i];
		// segment match:
		if (!m && param == val) continue;
		// segment mismatch / missing required field:
		if (!m || (!val && flag != '?' && flag != '*')) return;
		// field match:
		matches[param] = val && decodeURIComponent(val);
		// normal/optional field:
		if (flag >= '?' || flag === '') continue;
		// rest (+/*) match:
		matches[param] = url.slice(i).map(decodeURIComponent).join('/');
		break;
	}

	return matches;
};

export function LocationProvider(props) {
	const [url, route] = useReducer(UPDATE, location.pathname + location.search);
	const wasPush = push === true;

	const value = useMemo(() => {
		const u = new URL(url, location.origin);
		const path = u.pathname.replace(/(.)\/$/g, '$1');
		// @ts-ignore-next
		return { url, path, query: Object.fromEntries(u.searchParams), route, wasPush };
	}, [url]);

	useEffect(() => {
		addEventListener('click', route);
		addEventListener('popstate', route);

		return () => {
			removeEventListener('click', route);
			removeEventListener('popstate', route);
		};
	}, []);

	// @ts-ignore
	return h(LocationProvider.ctx.Provider, { value }, props.children);
}

export function Router(props) {
	const [, update] = useReducer(c => c + 1, 0);

	const loc = useLocation();

	const { url, path, query, wasPush } = loc;

	const cur = useRef(loc);
	const prev = useRef();
	const curChildren = useRef();
	const prevChildren = useRef();
	const pending = useRef();

	if (url !== cur.current.url) {
		pending.current = null;
		prev.current = cur.current;
		prevChildren.current = curChildren.current;
		// old <Committer> uses the pending promise ref to know whether to render
		prevChildren.current.props.pending = pending;
		cur.current = loc;

		// Hi! Wondering what this horrid line is for? That's totally reasonable, it is gross.
		// It prevents the old route from being remounted because it got shifted in the children Array.
		// @ts-ignore-next
		if (this.__v && this.__v.__k) this.__v.__k.reverse();
	}

	curChildren.current = useMemo(() => {
		let p, d, m;
		[].concat(props.children || []).some(vnode => {
			const matches = exec(path, vnode.props.path, (m = { path, query }));
			if (matches) return (p = cloneElement(vnode, m));
			if (vnode.props.default) d = cloneElement(vnode, m);
		});

		return h(Committer, {}, h(RouteContext.Provider, { value: m }, p || d));
	}, [url]);

	this.componentDidCatch = err => {
		if (err && err.then) pending.current = err;
	};

	useLayoutEffect(() => {
		let p = pending.current;

		const commit = () => {
			if (cur.current.url !== url || pending.current !== p) return;
			prev.current = prevChildren.current = pending.current = null;
			if (props.onLoadEnd) props.onLoadEnd(url);
			update(0);
			if (wasPush) scrollTo(0, 0);
		};

		if (p) {
			if (props.onLoadStart) props.onLoadStart(url);
			p.then(commit);
		} else commit();
	}, [url]);

	return [prevChildren.current, curChildren.current];
}

function Committer({ pending, children }) {
	return pending && !pending.current ? null : children;
}

Router.Provider = LocationProvider;

LocationProvider.ctx = createContext(/** @type {{ url: string, path: string, query: object, route }} */ ({}));
const RouteContext = createContext({});

export const Route = props => h(props.component, props);

export const useLocation = () => useContext(LocationProvider.ctx);
export const useRoute = () => useContext(RouteContext);
