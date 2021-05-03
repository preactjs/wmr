---
nav: 'Getting Started'
title: 'Getting Started with WMR'
description: 'Get up and running with WMR in a few seconds.'
---

You can run `npx wmr` in any directory to serve it, just like you would use a static file server.

However, it's often useful to start with a bit of structure. You can create this yourself, or use our quickstart method.

## Quickstart _(recommended)_

Create a new project in seconds using [create-wmr](https://npm.im/create-wmr). This tiny tool scaffolds a new project for you, with npm scripts for dev and prod builds, type checking and a simple demo application to start from.

```sh
npm init wmr your-project-name
```

or

```sh
yarn create wmr your-project-name
```

<p>
<img width="400" src="https://user-images.githubusercontent.com/105127/100917537-4661e100-34a5-11eb-89bd-565b7bc31919.gif">
</p>

> 💁 If you'd like ESLint to be set up for you, add `--eslint` to the command. _Note: this will use 150mb of disk space._

## Manual installation and setup

While it's best to use the quickstart method above, WMR caters to folks who want to start from scratch too.

There isn't really anything WMR-specific to set up - the steps here are essentially the what you would do to use a simple HTTP server.

**1.** First, install `wmr` using npm or yarn:

```sh
npm i -D wmr
# or:
yarn add -D wmr
```

> 🔥 _You can also use `npx wmr` anywhere!_

**2.** Next you'll want to create a `public/index.html` file. You can use [this example](https://github.com/preactjs/wmr/blob/main/packages/wmr/demo/public/index.html), though there's really nothing special about this HTML file. Just make sure your scripts are ES Modules by including `type="module"`:

```html
<!DOCTYPE html>
<html>
	<head>
		<link rel="stylesheet" href="/style.css" />
	</head>
	<body>
		<script type="module" src="/index.js"></script>
	</body>
</html>
```

> 💁 **Why `public/`?** Keeping your code and assets in `public/` prevents files like `node_modules` and `package.json` from being accessed by browsers. It also helps separate your web-facing code from other things like build scripts and output files.
> WMR auto-detects your `public/` directory, or you can specify your own by passing `--public src` to any of the commands.

**3.** To test things out, create that `index.js` file and add a simple Preact component to it:

```js
import { render } from 'preact';

function App() {
	return <h1>Hello World!</h1>;
}

render(<App />, document.body);
```

**4.** Now we can add some scripts to our `package.json`. There's one for starting the dev server, another to create a production build. A third script serves that production build for easy local testing:

```json
{
	"scripts": {
		"start": "wmr",
		"build": "wmr build",
		"serve": "wmr serve --http2"
	}
}
```

`preact/compat` is our compatibility layer that allows you to leverage the many libraries of the React ecosystem and use them with Preact. If this is something you'd like to use with WMR you can add an `alias` section as well to your `package.json`:

```json
{
	"alias": {
		"react": "preact/compat",
		"react-dom": "preact/compat"
	}
}
```

**5.** You're all set! As an extra step, if you'd like WMR to prerender your application to static HTML during production builds, replace `render()` with [preact-iso](https://www.npmjs.com/package/preact-iso):

```diff
-import { render } from 'preact';
+import { hydrate, prerender as ssr } from 'preact-iso';

function App() {
  return <h1>Hello World!</h1>;
}

-render(<App />, document.body);
+hydrate(<App />);

+export async function prerender(data) {
+  return ssr(<App {...data} />);
+}
```

## Configuration and plugins

WMR supports a `wmr.config.js` _(or `wmr.config.mjs`)_ configuration file, which can be used to set [WMR's options](https://github.com/preactjs/wmr/blob/main/packages/wmr/types.d.ts) and inject [Rollup plugins](https://github.com/rollup/plugins) or [Polka/Express middleware](https://github.com/lukeed/polka#middleware).

You can export a `default` config function applied to all WMR commands, or individual functions for `start`, `build` and `serve`:

```js
// wmr.config.mjs
import someRollupPlugin from '@rollup/plugin-xyz';

/** @param {import('wmr').Options} config */
export default async function (config) {
	if (config.mode === 'build') {
		config.plugins.push(
			// add any Rollup plugins:
			someRollupPlugin()
		);
	}

	if (config.mode === 'serve') {
		config.middleware.push(
			// add any Polka middleware:
			function myPolkaMiddleware(req, res, next) {
				res.setHeader('X-Foo', 'bar');
				next();
			}
		);
	}
}

// Or configure each WMR command separately:
export async function start(config) {
	// equivalent to `config.mode === 'start'`
}
export async function build(config) {
	// equivalent to `config.mode === 'build'`
}
export async function serve(config) {
	// equivalent to `config.mode === 'serve'`
}
```

> **Note:** remember to add `"type":"module"` to your package.json _or_ use the `.mjs` file extension to make the file a JS module.

See [the full list of options](https://github.com/preactjs/wmr/blob/main/packages/wmr/types.d.ts).

## Recipes

Most applications can be built with WMR without any configuration or plugins.
However, sometimes a bit of configuration can help optimize the output or simplify your development workflow.

WMR supports Rollup plugins, and there's a growing list of [**configurations and recipes**](https://github.com/preactjs/wmr/wiki/Configuration-Recipes) in the wiki, including:

- [minify the HTML output](https://github.com/preactjs/wmr/wiki/Configuration-Recipes#minifying-html)
- [import directories of modules](https://github.com/preactjs/wmr/wiki/Configuration-Recipes#importing-directories-of-files)
- [implement filesystem-based routing](https://github.com/preactjs/wmr/wiki/Configuration-Recipes#filesystem-based-routing--page-component-loading)
- [add a service worker](https://github.com/preactjs/wmr/wiki/Configuration-Recipes#service-worker)
