declare module 'content:*' {
	interface Item {
		name: string;
		nav?: string;
		title?: string;
		description?: string;
		image?: string;
		[key: string]: string;
	}
    const Data: Item[];
    export = Data;
}

declare module 'markdown:*' {
    const Url: string;
    export = Url;
}
