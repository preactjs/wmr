---
nav: Prerendering
title: 'Prerendering'
---

Prerendering is the process of generating an html file from your app that servers can send to clients. This allows the browser to immediately construct and display the website without waiting for script files to be loaded. Without prerendering users would see a blank page until script files are executed.

The implementation in WMR is framework agnostic and can be used with any framework. To enable prerendering run WMR with:

```bash
wmr build --prerender
```

WMR will look for an exported function named `prerender` in the first `<script>`-tag that's present in your main html file.

```js
export async function prerender(data) {
	// Do prerendering here.
	const html = `<h1>hello world</h1>`;

	return {
		// generated html
		html,
		// Optionally pass newly discovered links that should
		// be prerendered.
		links: new Set(['/foo', '/bar']),
		// Additional settings concerning the `<head>`-section of the
		// final prerendered html file.
		head: {
			// Value to use for the "lang" attribute: `<html lang="en">`
			lang: 'en',
			// The current page title that's used for the `<title>`-tag
			title: 'My cool page',
			// Optional: Additional elements to inject into `<head>`
			elements: new Set([
				{ type: 'link', props: { rel: 'stylesheet', href: 'foo.css' } },
				{ type: 'meta', props: { property: 'og:title', content: 'Social media title' } }
			])
		}
	};
}
```

## Accessing current route information

The `prerender()` function will be called with an object containing information about the current route that is prerendered. It has the following shape:

```ts
interface PrerenderData {
	ssr: boolean; // Always true during prerendering
	url: string; // The current url that's prerendered
}
```

## Prerendering Preact apps

For Preact the recommended combo to prerender apps is with [preact-iso](https://github.com/preactjs/wmr/tree/main/packages/preact-iso) to generate the HTML and [hoofd](https://github.com/JoviDeCroock/hoofd) for injecting meta information like the document title into the `<head>`-section of an HTML document. Together, a typical setup for prerendering looks similar to the following snippet:

```js
import { prerender as render } from 'preact-iso';
import { toStatic } from 'hoofd/preact';
import { App } from './App';

export async function prerender(data) {
	// Prerender your app with `preact-iso`.
	const result = await render(<App {...data} />);

	// use `hoofd` to collect all entries that should be injected
	// into the `<head>` portion of the final document
	const head = toStatic();
	const elements = new Set([
		...head.links.map(props => ({ type: 'link', props })),
		...head.metas.map(props => ({ type: 'meta', props })),
		...head.scripts.map(props => ({ type: 'script', props }))
	]);

	// Return the results back to WMR
	return {
		...result,
		head: {
			lang: head.lang,
			title: head.title,
			elements
		}
	};
}
```

Fun fact: That's the same way our documentation for WMR is prerendered!

> [preact-iso](https://github.com/preactjs/wmr/tree/main/packages/preact-iso) will automatically scan for any links in your application and pass these to WMR to continue prerendering. So there is no need to manually specifiy URLs that should be prerendered.
