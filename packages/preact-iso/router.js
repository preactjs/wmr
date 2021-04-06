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

const RESOLVED = Promise.resolve();

export function Router(props) {
	const [, update] = useReducer(c => c + 1, 0);

	const { url, path, query, wasPush } = useLocation();

	// Monotonic counter used to check if an un-suspending route is still the current route:
	const count = useRef(0);
	// The current route:
	const cur = useRef();
	// Previous route (if current route is suspended):
	const prev = useRef();
	// A not-yet-hydrated DOM root to remove once we commit:
	const pendingBase = useRef();
	// has this component ever successfully rendered without suspending:
	const hasEverCommitted = useRef(false);
	// was the most recent render successful (did not suspend):
	const didSuspend = useRef();
	didSuspend.current = false;

	cur.current = useMemo(() => {
		// This hack prevents Preact from diffing when we swap `cur` to `prev`:
		if (this.__v && this.__v.__k) this.__v.__k.reverse();

		count.current++;

		prev.current = cur.current;

		let p, d, m;
		[].concat(props.children || []).some(vnode => {
			const matches = exec(path, vnode.props.path, (m = { path, query }));
			if (matches) return (p = cloneElement(vnode, m));
			if (vnode.props.default) d = cloneElement(vnode, m);
		});

		return h(RouteContext.Provider, { value: m }, p || d);
	}, [url]);

	// Reset previous children - if rendering succeeds synchronously, we shouldn't render the previous children.
	const p = prev.current;
	prev.current = null;

	// This borrows the _childDidSuspend() solution from compat.
	this.__c = e => {
		// Mark the current render as having suspended:
		didSuspend.current = true;

		// The new route suspended, so keep the previous route around while it loads:
		prev.current = p;

		// Fire an event saying we're waiting for the route:
		if (props.onLoadStart) props.onLoadStart(url);

		// Re-render on unsuspend:
		let c = count.current;
		e.then(() => {
			// Ignore this update if it isn't the most recently suspended update:
			if (c !== count.current) return;

			// Successful route transition: un-suspend after a tick and stop rendering the old route:
			prev.current = null;
			RESOLVED.then(update);
		});
	};

	useLayoutEffect(() => {
		const currentDom = this.__v && this.__v.__e;

		// Ignore suspended renders (failed commits):
		if (didSuspend.current) {
			// If we've never committed, mark any hydration DOM for removal on the next commit:
			if (!hasEverCommitted.current && !pendingBase.current) {
				pendingBase.current = currentDom;
			}
			return;
		}

		// If this is the first ever successful commit and we didn't use the hydration DOM, remove it:
		if (!hasEverCommitted.current && pendingBase.current) {
			if (pendingBase.current !== currentDom) pendingBase.current.remove();
			pendingBase.current = null;
		}

		// Mark the component has having committed:
		hasEverCommitted.current = true;

		// The route is loaded and rendered.
		if (wasPush) scrollTo(0, 0);
		if (props.onLoadEnd) props.onLoadEnd(url);
	});

	// Note: curChildren MUST render first in order to set didSuspend & prev.
	return [h(RenderRef, { r: cur }), h(RenderRef, { r: prev })];
}

// Lazily render a ref's current value:
const RenderRef = ({ r }) => r.current;

Router.Provider = LocationProvider;

/** @typedef {{ url: string, path: string, query: object, route, wasPush: boolean }} RouteInfo */

LocationProvider.ctx = createContext(/** @type {RouteInfo} */ ({}));
const RouteContext = createContext({});

export const Route = props => h(props.component, props);

export const useLocation = () => useContext(LocationProvider.ctx);
export const useRoute = () => useContext(RouteContext);
