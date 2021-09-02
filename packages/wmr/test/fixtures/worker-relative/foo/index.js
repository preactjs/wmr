const worker = new Worker(new URL('./foo.worker.js', import.meta.url));

worker.addEventListener('message', e => {
	document.querySelector('h1').textContent = e.data;
});

worker.postMessage('hello');
