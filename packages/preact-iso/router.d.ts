import { VNode } from 'preact';

export function LocationProvider(props: { children?: VNode }): VNode;

export function Router(props: { onLoadEnd?: () => void, onLoadStart?: () => void, children?: VNode[] }): VNode;

export const useLoc: () => { url: string, path: string, query: Object, route };

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
