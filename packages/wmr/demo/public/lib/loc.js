import { h, createContext, cloneElement } from 'preact';
import { useContext, useMemo, useReducer, useEffect, useRef } from 'preact/hooks';

const UPDATE = (state, url, push) => {
	if (url && url.type === 'click') {
		const link = url.target.closest('a[href]');
		if (!link || link.origin != location.origin) return state;

		url.preventDefault();
		push = true;
		url = link.href.replace(location.origin, '');
	} else if (typeof url !== 'string') {
		url = location.pathname + location.search;
	}

	if (push === true) history.pushState(null, '', url);
	else if (push === false) history.replaceState(null, '', url);
	return url;
};

const exec = (url, route, matches) => {
	url = url.trim('/').split('/');
	route = (route || '').trim('/').split('/');
	for (let i = 0, val; i < Math.max(url.length, route.length); i++) {
		let [, m, param, flag] = (route[i] || '').match(/^(\:?)(.*?)([+*?]?)$/);
		val = url[i];
		// segment match:
		if (!m && param == val) continue;
		// segment mismatch / missing required field:
		if (!m || (!val && flag != '?' && flag != '*')) return;
		// field match:
		matches[param] = val && decodeURIComponent(val);
		// normal/optional field:
		if (flag >= '?') continue;
		// rest (+/*) match:
		matches[param] = url.slice(i).map(decodeURIComponent).join('/');
		break;
	}

	return matches;
};

export function LocationProvider(props) {
	const [url, route] = useReducer(UPDATE, location.pathname + location.search);

	const value = useMemo(() => {
		const u = new URL(url, location.origin);
		const path = u.pathname.replace(/(.)\/$/g, '$1');
		// @ts-ignore-next
		return { url, path, query: Object.fromEntries(u.searchParams), route };
	}, [url]);

	useEffect(() => {
		addEventListener('click', route);
		addEventListener('popstate', route);

		return () => {
			removeEventListener('click', route);
			removeEventListener('popstate', route);
		};
	});

	// @ts-ignore
	return h(LocationProvider.ctx.Provider, { value }, props.children);
}

export function Router(props) {
	const [, update] = useReducer(c => c + 1, 0);

	const loc = useLoc();

	const { url, path, query } = loc;

	const cur = useRef(loc);
	const prev = useRef();
	const curChildren = useRef();
	const prevChildren = useRef();
	const pending = useRef();

	if (url !== cur.current.url) {
		pending.current = null;
		prev.current = cur.current;
		prevChildren.current = curChildren.current;
		cur.current = loc;
	}

	this.componentDidCatch = err => {
		if (err && err.then) {
			// Trigger an update so the rendering login will pickup the pending promise.
			update(1);
			pending.current = err;
		}
	};

	useEffect(() => {
		let p = pending.current;
		const commit = () => {
			if (cur.current.url !== url || pending.current !== p) return;
			if (props.onLoadEnd) props.onLoadEnd(url);
			prev.current = prevChildren.current = null;
			update(0);
		};

		if (p) {
			if (props.onLoadStart) props.onLoadStart(url);
			p.then(commit);
		} else commit();
	}, [url]);

	let p, d, m;
	[].concat(props.children || []).some(vnode => {
		const matches = exec(path, vnode.props.path, (m = { path, query }));
		if (matches) {
			return (p = (
				<RouteContext.Provider value={{ ...matches }}>
					{cloneElement(vnode, { ...m, ...matches })}
				</RouteContext.Provider>
			));
		}
		if (vnode.props.default) d = cloneElement(vnode, m);
		return undefined;
	});

	return [(curChildren.current = p || d), prevChildren.current];
}

Router.Provider = LocationProvider;

LocationProvider.ctx = createContext(/** @type {{ url: string, path: string, query: object, route }} */ ({}));

const RouteContext = createContext({});

export const useLoc = () => useContext(LocationProvider.ctx);
export const useLocation = useLoc;
export const useRoute = () => useContext(RouteContext);
