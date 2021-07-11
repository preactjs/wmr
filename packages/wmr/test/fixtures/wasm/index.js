// import sample from './add.wasm';

// sample({ ...imports }).then(({ instance }) => {
// 	console.log(instance.exports.main());
// 	document.querySelector('h1').textContent = 'it works';
// });

fetch('add.wasm')
	.then(response => response.arrayBuffer())
	.then(bytes => WebAssembly.instantiate(bytes))
	.then(results => {
		const r = results.instance.exports.add(42);
		console.log(results.instance);
		if (r === 42) {
			document.querySelector('h1').textContent = 'it works';
		}
	});

async function importWasm(url) {
	const obj = await WebAssembly.instantiateStreaming(fetch(url));
	return obj.instance.exports;
}

// (async () => {
// 	const mod = await import('./add.wasm');
// 	const r = mod.add(42);

// 	if (r === 42) {
// 		document.querySelector('h1').textContent = 'it works';
// 	}
// })();
