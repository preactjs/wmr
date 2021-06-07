import content from 'content:../content/docs';
export { content };

const pages = new Map(
	content.map((item, index) => {
		if ('heading' in item) return ['', -1];
		item.slug = `/docs/${item.name.replace(/^index$/, '')}`;
		return [item.name, index];
	})
);

/** @param {string} name */
export const getPage = name => content[pages.get(name)];

/** @param {string} name */
export const getPreviousPage = name => pages[pages.get(name) - 1];

/** @param {string} name */
export const getNextPage = name => pages[pages.get(name) + 1];
