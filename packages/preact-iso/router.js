import { h, createContext, cloneElement } from 'preact';
import { useContext, useMemo, useCallback, useReducer, useEffect, useLayoutEffect, useRef } from 'preact/hooks';

/**
 * @param {string} state
 * @param {MouseEvent|PopStateEvent|Object|string} update
 * @return {string|undefined}
 */
const UPDATE = (state, update) => {
	/** @type {boolean|undefined} - History state update strategy */
	let push, url;

	if (!update || typeof update === 'string') {
		// manual invocation: route(url)
		url = update;
		push = true;
	} else if (update.type === 'click') {
		// user click
		const link = update.target.closest('a[href]');
		if (!link || link.origin != location.origin) return state;

		update.preventDefault();
		url = link.pathname + link.search + link.hash;
		push = true;
	} else if (update.type === 'popstate') {
		// navigation
		url = location.pathname + location.search + location.hash;
	} else {
		// manual invocation: route({ url, replace })
		url = update.url || update;
		push = !url.replace;
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
	const [url, doRoute] = useReducer(UPDATE, location.pathname + location.search);
	const route = useCallback((url, replace) => doRoute({ url, replace }), []);

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
	}, []);

	// @ts-ignore
	return h(LocationProvider.ctx.Provider, { value }, props.children);
}

export function Router(props) {
	const [, update] = useReducer(c => c + 1, 0);

	const loc = useLocation();

	const { url, path, query } = loc;

	const cur = useRef(loc);
	const prev = useRef();
	const curChildren = useRef();
	const prevChildren = useRef();
	const pending = useRef();

	let reverse = false;
	if (url !== cur.current.url) {
		reverse = true;
		pending.current = null;
		prev.current = cur.current;
		prevChildren.current = curChildren.current;
		// old <Committer> uses the pending promise ref to know whether to render
		prevChildren.current.props.pending = pending;
		cur.current = loc;
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
		};

		if (p) {
			if (props.onLoadStart) props.onLoadStart(url);
			p.then(commit);
		} else commit();
	}, [url]);

	// Hi! Wondering what this horrid line is for? That's totally reasonable, it is gross.
	// It prevents the old route from being remounted because it got shifted in the children Array.
	if (reverse && this.__v && this.__v.__k) this.__v.__k.reverse();

	return [curChildren.current, prevChildren.current];
}

function Committer({ pending, children }) {
	return pending && !pending.current ? null : children;
}

Router.Provider = LocationProvider;

LocationProvider.ctx = createContext(/** @type {{ url: string, path: string, query: object, route }} */ ({}));
const RouteContext = createContext({});

export const Route = (props) => h(props.component, props);

export const useLocation = () => useContext(LocationProvider.ctx);
export const useRoute = () => useContext(RouteContext);
