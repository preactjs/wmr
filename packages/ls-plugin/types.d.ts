declare module "@wmr/ls-plugin" {
	import { Plugin } from 'rollup';

	export interface Options {
		cwd: string;
	}

	export default (opts: Options) => Plugin
}
