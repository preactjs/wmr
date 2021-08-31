import content from 'content:../content/docs';
export { content };

/** @type {(item: any) => item is ContentItem} */
const isContentItem = item => !('heading' in item);

// Filter out headings so that we can access previous and next page
// by index later
const pageOrder = content.filter(isContentItem).map(item => {
	item.slug = `/docs/${item.name}`.replace(/\/index$/g, '');
	return item;
});

const pages = new Map(
	pageOrder.map((item, index) => {
		return [item.name, index];
	})
);

/** @param {string} name */
export const getPage = name => pageOrder[pages.get(name)];

/** @param {string} name */
export const getPreviousPage = name => pageOrder[pages.get(name) - 1];

/** @param {string} name */
export const getNextPage = name => pageOrder[pages.get(name) + 1];
