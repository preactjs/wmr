interface ContentHeading {
	heading: string;
}
interface ContentItem {
	name: string;
	nav?: string;
	title?: string;
	description?: string;
	image?: string;
	slug?: string;
	[key: string]: string;
}

declare module 'content:*' {
    const Data: Array<ContentItem | ContentHeading>;
    export = Data;
}

declare module 'markdown:*' {
    const Url: string;
    export = Url;
}

interface Window {
	page: HTMLDivElement
}
