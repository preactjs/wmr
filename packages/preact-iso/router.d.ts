import { AnyComponent, FunctionComponent, VNode } from 'preact';

export const LocationProvider: FunctionComponent;

export function Router(props: { onLoadEnd?: (url: string) => void; onLoadStart?: (url: string) => void; children?: VNode[] }): VNode;

interface LocationHook {
	url: string;
	path: string;
	query: Record<string, string>;
	route: (url: string | { url: string, replace?: boolean }) => void;
}
export const useLocation: () => LocationHook;

export const useRoute: () => { [key: string]: string };

interface RoutableProps {
	path?: string;
	default?: boolean;
}

export interface RouteProps<Props> extends RoutableProps {
	  component: AnyComponent<Props>;
}

export function Route<Props>(props: RouteProps<Props> & Partial<Props>): VNode;

declare module 'preact' {
	namespace JSX {
		interface IntrinsicAttributes extends RoutableProps {}
	}
	interface Attributes extends RoutableProps {}
}
