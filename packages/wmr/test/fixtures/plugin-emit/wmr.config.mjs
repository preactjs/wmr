export default function foo() {
	return [
		{
			name: 'plugin-a',
			async transform(code, id) {
				if (!id.endsWith('index.js')) return;

				const chunkRefId = this.emitFile({
					id: 'public/worker.js',
					type: 'chunk'
				});

				return {
					code: `const url = new URL(import.meta.ROLLUP_FILE_URL_${chunkRefId}, import.meta.url);
					const worker = new Worker(url, { type: "module" });
					worker.addEventListener("message", e => {
						document.querySelector("h1").textContent = e.data;
					});
					worker.postMessage("hello");`,
					map: null
				};
			}
		}
	];
}
