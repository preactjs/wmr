# WMR

[![npm](https://img.shields.io/npm/v/wmr.svg)](http://npm.im/wmr)
[![install size](https://packagephobia.com/badge?p=wmr)](https://packagephobia.com/result?p=wmr)
[![OpenCollective Backers](https://opencollective.com/preact/backers/badge.svg)](#backers)
[![OpenCollective Sponsors](https://opencollective.com/preact/sponsors/badge.svg)](#sponsors)

**The tiny all-in-one development tool for modern web apps**, in a single 2mb file with no dependencies.

All the features you'd expect and more, from development to production:

🔨 &nbsp; No entry points or pages to configure - just HTML files with `<script type=module>`<br>
🦦 &nbsp; Safely `import "packages"` from npm **_without installation_**<br>
📦 &nbsp; Smart bundling and caching for npm dependencies<br>
↻ &nbsp; Hot reloading for modules, Preact components and CSS<br>
⚡️ &nbsp; Lightning-fast JSX support that you can debug in the browser<br>
💄 &nbsp; Import CSS files and [CSS Modules](https://github.com/css-modules/css-modules) (`*.module.css`)<br>
🔩 &nbsp; Out-of-the-box support for [TypeScript](https://www.typescriptlang.org/)<br>
📂 &nbsp; Static file serving with hot reloading of CSS and images<br>
🗜 &nbsp; Highly optimized Rollup-based production output (`wmr build`)<br>
📑 &nbsp; Crawls and pre-renders your app's pages to static HTML at build time<br>
🏎 &nbsp; Built-in HTTP2 in dev and prod (`wmr serve --http2`)<br>
🔧 &nbsp; Supports [Rollup plugins](#configuration-and-plugins), even in development where Rollup isn't used

## Quickstart _(recommended)_

Create a new project in seconds using [create-wmr](https://npm.im/create-wmr):

<strong><code>npm init wmr your-project-name</code></strong>

or

<strong><code>yarn create wmr your-project-name</code></strong>

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

**2.** Next you'll want to create a `public/index.html` file. You can use [this example](https://github.com/preactjs/wmr/blob/master/demo/public/index.html), though there's really nothing special about this HTML file. Just make sure your scripts are ES Modules by including `type="module"`:

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
+import hydrate from 'preact-iso/hydrate';

function App() {
  return <h1>Hello World!</h1>;
}

-render(<App />, document.body);
+hydrate(<App />);

+export async function prerender(data) {
+  // we use dynamic import to prevent this from being loaded in the browser:
+  return (await import('preact-iso/prerender')).default(<App {...data} />);
+}
```

## Configuration and plugins

WMR supports a `wmr.config.js` (or `wmr.config.mjs`) configuration file.
You can export a `default` config function, or individual config functions for each of the `start`, `build` and `serve` commands:

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

// OR

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

See [the full list of options](https://github.com/preactjs/wmr/blob/master/types.d.ts).

## Recipes

Here we'll outline some recipes that might come in handy when making an application with `wmr`.

### Minifying HTML

To minify HTML we can use [rollup-plugin-html-minifier](https://www.npmjs.com/package/rollup-plugin-html-minifier).

```sh
yarn add rollup-plugin-html-minifier
## or
npm i --save rollup-plugin-html-minifier
```

After we've installed this package we can add it to the config file (`wmr.config.js`).

```js
import htmlMinifier from 'rollup-plugin-html-minifier';

export function build({ plugins }) {
	plugins.push(
		htmlMinifier({
			// any options here
		})
	);
}
```

## Contributing

```sh
git clone git@github.com:preactjs/wmr.git
cd wmr
npm i

# run the demo (no compile)
npm run demo

# build and serve the demo for prod
npm run demo:prod && npm run demo:serve

# build the single-file CLI:
npm run build
```
