declare const jestPuppeteer: {
	debug(): Promise<void>;
	resetPage(): Promise<void>;
	resetBrowser(): Promise<void>;
};
declare const browser: import('puppeteer').Browser;
declare const page: import('puppeteer').Page;

declare interface TestEnv {
	tmp: import('tmp-promise').DirectoryResult;
	browser: typeof browser;
	page: typeof page;
}

declare interface WmrInstance {
	output: string[];
	code: number;
	address: Promise<string>;
	close: () => void;
	done: Promise<this['code']>;
}

declare module 'json:*' {}
