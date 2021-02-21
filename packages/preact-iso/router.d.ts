import { FunctionComponent, VNode } from 'preact';

export const LocationProvider: FunctionComponent;

export function Router(props: { onLoadEnd?: () => void; onLoadStart?: () => void; children?: VNode[] }): VNode;

interface LocationHook {
	url: string;
	path: string;
	query: Record<string, string>;
	route: (url: string) => void;
};
export const useLocation: () => LocationHook;
/** @deprecated renamed to useLocation() */
export const useLoc: () => LocationHook;

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
