import { Plugin } from 'rollup';
import { Options } from 'wmr';

export default function swPlugin(options?: Options): Plugin;

declare module 'sw:*' {
	const url: string;
	export default url;
}
