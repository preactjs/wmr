import { FunctionComponent, VNode } from 'preact';

export const LocationProvider: FunctionComponent;

export function Router(props: { onLoadEnd?: () => void, onLoadStart?: () => void, children?: VNode[] }): VNode;

export const useLoc: () => { url: string, path: string, query: Record<string, string>, route: (url: string) => void };

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
