import { h, createContext, cloneElement } from 'preact';
import { useContext, useMemo, useReducer, useEffect, useLayoutEffect, useRef } from 'preact/hooks';

let push;
const UPDATE = (state, url) => {
	push = undefined;
	if (url && url.type === 'click') {
		const link = url.target.closest('a[href]');
		if (
			!link ||
			link.origin != location.origin ||
			/^#/.test(link.getAttribute('href')) ||
			!/^(_?self)?$/i.test(link.target)
		) {
			return state;
		}

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

	this.componentDidCatch = err => {
		if (err && err.then) {
			pending.current = err;
		}
	};

	curChildren.current = useMemo(() => {
		let p, d, m;
		[].concat(props.children || []).some(vnode => {
			const matches = exec(path, vnode.props.path, (m = { path, query }));
			if (matches) return (p = cloneElement(vnode, m));
			if (vnode.props.default) d = cloneElement(vnode, m);
		});

		return h(Committer, {}, h(RouteContext.Provider, { value: m }, p || d));
	}, [url]);

	useLayoutEffect(() => {
		let p = pending.current;
		let isCurrentCycle = true;

		const commit = () => {
			if (cur.current.url !== url || pending.current !== p || !isCurrentCycle) {
				let p, d, m;
				[].concat(props.children || []).some(vnode => {
					const matches = exec(path, vnode.props.path, (m = { path, query }));
					if (matches) return (p = cloneElement(vnode, m));
					if (vnode.props.default) d = cloneElement(vnode, m);
				});

				cur.current.url = url;
				prevChildren.current = null;
				curChildren.current = h(Committer, {}, h(RouteContext.Provider, { value: m }, p || d));
				if (wasPush) scrollTo(0, 0);
				if (this.__v && this.__v.__k) this.__v.__k.reverse();
				update(0);
				return;
			} else {
				prev.current = prevChildren.current = pending.current = null;
				if (props.onLoadEnd) props.onLoadEnd(url);
				if (this.__v && this.__v.__k) this.__v.__k.reverse();
				update(0);
				if (wasPush) scrollTo(0, 0);
			}
		};

		if (p) {
			if (props.onLoadStart) props.onLoadStart(url);
			p.then(commit);
		} else {
			commit();
		}

		return () => {
			if (cur.current.url !== url || pending.current !== p) {
				isCurrentCycle = false
				pending.current = null;
				prev.current = cur.current;
				prevChildren.current = curChildren.current;
				prevChildren.current.props.pending = pending;
				cur.current = loc;
			}
		}
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
