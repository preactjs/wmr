import { FunctionComponent, VNode } from 'preact';

export const LocationProvider: FunctionComponent;

export function Router(props: { onLoadEnd?: () => void, onLoadStart?: () => void, children?: VNode[] }): VNode;

type LocationHook =	() => { url: string, path: string, query: Record<string, string>, route: (url: string) => void };
export const useLoc: LocationHook;
export const useLocation: LocationHook;

interface RoutableProps {
	path?: string;
	default?: boolean;
}

declare module 'preact' {
	namespace JSX {
		interface IntrinsicAttributes extends RoutableProps {}
	}
	interface Attributes extends RoutableProps {}
}
