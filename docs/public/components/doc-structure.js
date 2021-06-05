import content from 'content:../content/docs';

export const docStructure = [
	{ type: 'heading', name: 'Prologue' },
	{ type: 'page', name: 'index' },
	{ type: 'page', name: 'cli' },
	{ type: 'page', name: 'configuration' },
	{ type: 'page', name: 'plugins' },
	{ type: 'page', name: 'prerendering' },

	{ type: 'heading', name: 'API' },
	{ type: 'page', name: 'plugin-api' }
];

/** @type {Map<string, {name: string, nav?: string, title?: string, slug: string}} */
export const docPages = new Map();
for (const doc of content) {
	const route = doc.name.replace(/(^|\/)index$/g, '');
	const slug = route ? `/docs/${route}` : '/docs';

	docPages.set(doc.name, {
		...doc,
		slug
	});
}

/**
 * @param {string} name
 * @returns {number | null}
 */
export function getPreviousPage(name) {
	let idx = docStructure.findIndex(x => x.name === name) - 1;
	if (idx < 0) return null;
	if (docStructure[idx].type === 'heading') {
		if (idx - 1 >= 0 && docStructure[idx - 1].type !== 'heading') {
			idx--;
		} else {
			return null;
		}
	}

	return docPages.get(docStructure[idx].name);
}

/**
 * @param {string} name
 * @returns {number | null}
 */
export function getNextPage(name) {
	let idx = docStructure.findIndex(x => x.name === name) + 1;
	if (idx > docStructure.length - 1) return null;
	if (docStructure[idx].type === 'heading') {
		if (idx + 1 < docStructure.length && docStructure[idx + 1].type !== 'heading') {
			idx++;
		} else {
			return null;
		}
	}

	return docPages.get(docStructure[idx].name);
}
