import { Plugin, OutputOptions } from 'rollup';
import { Middleware } from 'polka';

export type Mode = 'start' | 'serve' | 'build';

export { Middleware };

export type OutputOption = OutputOptions | ((opts: OutputOptions) => OutputOptions);

export interface Options {
	prod: boolean;
	mode: Mode;
	cwd: string;
	public: string;
	root: string;
	out: string;
	overlayDir: string;
	aliases: Record<string, string>;
	env: Record<string, string>;
	middleware: Middleware[];
	plugins: Plugin[];
	output: OutputOption[];
}
