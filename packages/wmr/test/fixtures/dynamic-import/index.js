console.log('hello from index.js');
const pages = ['one', 'two'];
const mods = Promise.all(pages.map(page => import(`./pages/${page}.js`))).then(m => {
	console.log('loaded pages');
	console.log(m.map(m => m.default).join());
});

export async function prerender() {
	await mods;
	return { html: 'nothing here' };
}
