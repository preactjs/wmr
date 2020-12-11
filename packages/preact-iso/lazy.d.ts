import { FunctionalComponent, VNode } from 'preact';

export default function lazy<T>(load: () => Promise<{ default: T }>): T;

export function ErrorBoundary(props: { children?: VNode }): VNode;
