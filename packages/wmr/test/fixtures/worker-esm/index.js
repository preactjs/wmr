import { value as value2 } from './entry-1';

document.querySelector('h2').textContent = value2;

const worker = new Worker(new URL('./foo.worker.js', import.meta.url), { type: 'module' });

worker.addEventListener('message', e => {
	document.querySelector('h1').textContent = e.data;
});

worker.postMessage('hello');
