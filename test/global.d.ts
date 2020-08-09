declare interface TestEnv {
	tmp: import('tmp-promise').DirectoryResult;
	instance: WmrInstance;
	page: import('puppeteer').Page;
}

declare interface WmrInstance {
	output: string[];
	code: number;
	close: () => void;
}
