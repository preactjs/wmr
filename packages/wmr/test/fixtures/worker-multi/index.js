const foo = new Worker(new URL('./foo.worker.js', import.meta.url), { type: 'module' });
const bar = new Worker(new URL('./foo.worker.js', import.meta.url), { type: 'module' });

foo.addEventListener('message', e => {
	document.querySelector('h1').textContent = e.data;
});
bar.addEventListener('message', e => {
	document.querySelector('h2').textContent = e.data;
});

foo.postMessage('hello');
bar.postMessage('hello');
