const worker = new Worker(new URL('./foo.worker.js', import.meta.url));

export async function prerender() {
	const text = await new Promise(resolve => {
		worker.addEventListener('message', e => {
			resolve(e.data);
		});
	});

	worker.postMessage('hello');

	return {
		html: `<h1>${text}</h1>`
	};
}
