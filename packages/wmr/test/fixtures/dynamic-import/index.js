console.log('hello from index.js');

// eslint-disable-next-line no-async-promise-executor
const mods = new Promise(async resolve => {
	let out = [];

	// Use a for loop to ensure a consistent loading order
	for (const page of ['one', 'two']) {
		const m = await import(`./pages/${page}.js`);
		out.push(m);
	}

	console.log('loaded pages');
	console.log(out.map(m => m.default).join());
	resolve(out);
});

export async function prerender() {
	await mods;
	return { html: 'nothing here' };
}
