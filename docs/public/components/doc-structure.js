import content from 'content:../content/docs';

export const docStructure = [
	{ type: 'heading', name: 'Prologue' },
	{ type: 'page', name: 'index' },
	{ type: 'page', name: 'cli' },
	{ type: 'page', name: 'configuration' },
	{ type: 'page', name: 'plugins' },

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
