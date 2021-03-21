import { Plugin } from 'rollup';
import { Options } from 'wmr';

export default function directoryPlugin(options?: Options): Plugin;

declare module 'dir:*' {
	const files: string[];
	export default files;
}
