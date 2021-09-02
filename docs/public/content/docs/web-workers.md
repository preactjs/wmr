---
nav: Web Workers
title: 'Web Workers'
---

[Web Workers](https://developer.mozilla.org/en-US/docs/Web/API/Web_Workers_API/Using_web_workers) are a way to do threading in JavaScript. It is a simple mean to run work in the background to keep the main thread responsive for UI work.

To use web workers with WMR you can use the [Web Workers API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Workers_API/Using_web_workers#web_workers_api) directly.

```js
// index.js
const worker = new Worker(new URL('./my.worker.js', import.meta.url));

// Subscribe to messages coming from the worker
worker.addEventListener('message', e => console.log(e.data));

// Ping worker
worker.postMessage("Let's go");
```

WMR relies on the filename to detect workers. That's why it must have the `.worker` suffix in the filename.

```js
// my.worker.js
addEventListener('message', () => {
	// Always answer with "hello"
	postMessage('hello');
});
```

> We highly recommend using [comlink](https://github.com/GoogleChromeLabs/comlink) for working with web workers. It abstracts away the manual message passing that's required to communicate workers.

## ESM Support in Web Workers

Support for module mode so that you can use `import` and `export` statements can be turned on by passing `{ format: 'module' }` to the `Worker` constructor.

```js
const workerUrl = new URL('./my.worker.js', import.meta.url);
const worker = new Worker(workerUrl, { type: 'module' });
```

> Be cautious: ESM is not yet supported in every mainstream browser.
