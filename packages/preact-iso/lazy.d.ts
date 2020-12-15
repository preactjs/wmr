import { ComponentChildren, VNode } from 'preact';

export default function lazy<T>(load: () => Promise<{ default: T }>): T;

export function ErrorBoundary(props: { children?: ComponentChildren }): VNode;
