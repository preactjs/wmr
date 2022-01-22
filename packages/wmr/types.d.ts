// Declarations used by plugins and WMR itself

declare module 'wmr' {
	import { Plugin as RollupPlugin, OutputOptions, RollupError, RollupWatcherEvent } from 'rollup';
	import { ServerResponse, IncomingMessage } from 'http';

	export type Mode = 'start' | 'serve' | 'build';

	export interface Request extends IncomingMessage {
		/**
		 * The originally-requested URL, including parent router segments.
		 */
		originalUrl: string;

		/**
		 * The path portion of the requested URL.
		 */
		path: string;

		/**
		 * The values of named parameters within your route pattern
		 */
		params: Record<string, string>;

		/**
		 * The un-parsed querystring
		 */
		search: string | null;

		/**
		 * The parsed querystring
		 */
		query: Record<string, string | string[]>;
	}

	export type Next = (err?: string | Error) => void;
	export type Middleware = (req: Request, res: ServerResponse, next: Next) => void;

	export type OutputOption = OutputOptions | ((opts: OutputOptions) => OutputOptions);

	export type Features = {
		preact: boolean;
	};

	// Rollup+
	export interface Plugin extends RollupPlugin {
		/**
		 * Specify when a plugin should be executed.
		 */
		enforce?: 'pre' | 'post' | 'normal';
		config?: (config: Options) => Partial<Options> | void;
		configResolved?: (config: Options) => Partial<Options> | void;
	}

	export interface Options {
		prod: boolean;
		minify: boolean;
		mode: Mode;
		cwd: string;
		reload: boolean;
		public: string;
		publicPath: string;
		host: string;
		port: number;
		root: string;
		out: string;
		overlayDir: string;
		sourcemap: boolean;
		/**
		 * @deprecated Please use `alias` instead
		 */
		aliases: Record<string, string>;
		alias: Record<string, string>;
		env: Record<string, string>;
		middleware: Middleware[];
		plugins: Plugin[];
		output: OutputOption[];
		features: Features;
		visualize: boolean;
		debug: boolean;
		customRoutes: string[];
		/**
		 * Automatically fetch missing npm packages from npm registry.
		 * This is only intended for quick prototyping.
		 */
		autoInstall: boolean;
		/**
		 * NPM registry url to use if `--autoInstall` is enabled
		 */
		registry: string;
	}

	export type BuildError = RollupError & { clientMessage?: string };
	export type BuildEvent = { changes: string[] } & Extract<RollupWatcherEvent, { code: 'BUNDLE_END' }>;
	export type ChangeEvent = { changes: string[]; duration: number; reload?: boolean };

	export interface BuildOptions extends Options {
		/** @experimental */
		profile?: boolean;
		/** @hidden Internal use only, don't use this */
		npmChunks?: boolean;
		/** @hidden Internal use only, don't use this */
		onError?: (error: BuildError) => void;
		/** @hidden Internal use only, don't use this */
		onBuild?: (event: BuildEvent) => void;
		/** @hidden Internal use only, don't use this */
		onChange?: (event: ChangeEvent) => void;
	}

	export function defineConfig<
		T extends Partial<Options> | ((options: Options) => void | Partial<Options> | Promise<void | Partial<Options>>)
	>(options: T): T;
}

// Declarations used by WMR-based applications

declare interface ImportMeta {
	hot?: {
		accept(module: ({ module: ImportMeta }) => void): void;
		invalidate(): void;
		reject(): void;
	};
	env: Record<string, string>;
}

declare interface NodeModule {
	hot?: ImportMeta['hot'] | void;
}
declare var module: NodeModule;

/** Maps authored classNames to their CSS Modules -suffixed generated classNames. */
type Mapping = Record<string, string>;
declare module '*.module.css' {
	const mapping: Mapping;
	export default mapping;
}
declare module '*.module.scss' {
	const mapping: Mapping;
	export default mapping;
}
declare module '*.module.sass' {
	const mapping: Mapping;
	export default mapping;
}
declare module '*.module.less' {
	const mapping: Mapping;
	export default mapping;
}
declare module '*.module.styl' {
	const mapping: Mapping;
	export default mapping;
}

declare module '*.css' {
	const url: string;
	export default url;
}
declare module '*.scss' {
	const url: string;
	export default url;
}
declare module '*.sass' {
	const url: string;
	export default url;
}
declare module '*.less' {
	const url: string;
	export default url;
}
declare module '*.styl' {
	const url: string;
	export default url;
}

// Import Prefixes
declare module 'json:*';
declare module 'css:*';
declare module 'url:*' {
	const url: string;
	export default url;
}
declare module 'bundle:*' {
	const url: string;
	export default url;
}

// Implicit URL Imports (see url-plugin)
declare module '*.png' {
	const url: string;
	export default url;
}
declare module '*.jpg' {
	const url: string;
	export default url;
}
declare module '*.jpeg' {
	const url: string;
	export default url;
}
declare module '*.gif' {
	const url: string;
	export default url;
}
declare module '*.webp' {
	const url: string;
	export default url;
}
declare module '*.svg' {
	const url: string;
	export default url;
}
declare module '*.mp4' {
	const url: string;
	export default url;
}
declare module '*.ogg' {
	const url: string;
	export default url;
}
declare module '*.mp3' {
	const url: string;
	export default url;
}
declare module '*.wav' {
	const url: string;
	export default url;
}
declare module '*.flac' {
	const url: string;
	export default url;
}
declare module '*.aac' {
	const url: string;
	export default url;
}
declare module '*.woff' {
	const url: string;
	export default url;
}
declare module '*.woff2' {
	const url: string;
	export default url;
}
declare module '*.eot' {
	const url: string;
	export default url;
}
declare module '*.ttf' {
	const url: string;
	export default url;
}
declare module '*.otf' {
	const url: string;
	export default url;
}

// Make Preact's JSX the global JSX
declare namespace JSX {
	// @ts-ignore
	interface IntrinsicElements extends preact.JSX.IntrinsicElements {}
	// @ts-ignore
	interface IntrinsicAttributes extends preact.JSX.IntrinsicAttributes {}
	// @ts-ignore
	interface Element extends preact.JSX.Element {}
	// @ts-ignore
	interface ElementClass extends preact.JSX.ElementClass {}
	interface ElementAttributesProperty extends preact.JSX.ElementAttributesProperty {}
	interface ElementChildrenAttribute extends preact.JSX.ElementChildrenAttribute {}
	interface CSSProperties extends preact.JSX.CSSProperties {}
	interface SVGAttributes extends preact.JSX.SVGAttributes {}
	interface PathAttributes extends preact.JSX.PathAttributes {}
	interface TargetedEvent extends preact.JSX.TargetedEvent {}
	interface DOMAttributes<Target extends EventTarget> extends preact.JSX.DOMAttributes<Target> {}
	interface HTMLAttributes<RefType extends EventTarget = EventTarget> extends preact.JSX.HTMLAttributes<RefType> {}
}
