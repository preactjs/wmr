# WMR

An instant development server for modern code. One 2mb file with no dependencies.

WMR is an all-in-one development and production build tool:

- 🕶 No "entry points" or "pages" to configure - just `<script type=module src=anything.js>`
- ⛳️ `import "packages"` from npm **_without installation_**
- 📦 Smart bundling and caching for npm dependencies
- 🔄 Hot reloading for modules, Preact components and CSS
- ⚡️ Lightning-fast JSX support that you can debug in the browser
- 💄 Import CSS files and [CSS Modules](https://github.com/css-modules/css-modules) (`*.module.css`)
- 🦄 Static file serving with hot reloading of CSS and images
- 🗜 Highly optimized Rollup-based production output (`wmr build`)
- 🏎 Built-in HTTP2 support in both development and production (`preact serve --http2`)
- 🔧 Supports Rollup plugins, even in development where Rollup isn't used

## Quickstart _(recommended)_

Create a new project in seconds with [create-wmr](https://npm.im/create-wmr):

```sh
npm init wmr your-project-name
```

> If you'd also like ESLint to be set, add `--eslint` to the command. _Note that ESLint will use 150mb of disk space._

## Manual installation and setup

While it's best to use the quickstart method above, WMR caters to folks who want to start from scratch too.

There isn't really anything WMR-specific to set up - the steps here are essentially the what you would do to use a simple HTTP server.

1. First, install `wmr` using npm or yarn:

```sh
npm i -D wmr
# or:
yarn add -D wmr
```

> 🔥 _You can also use `npx wmr` anywhere!_

2. Next you'll want to create an `index.html` file. You can use [this example](https://github.com/preactjs/wmr/blob/master/demo/public/index.html),
but there's nothing special here. To add scripts, make sure to include `type="module"`:

```html
<!DOCTYPE html>
<html>
  <head>
    <link rel="stylesheet" href="/style.css">
  </head>
  <body>
    <script type="module" src="/index.js"></script>
  </body>
</html>
```

3. To test things out, create that `index.js` file and add a simple Preact component to it:

```js
import { render } from 'preact';

function App() {
  return <h1>Hello World!</h1>;
}

render(<App />, document.body);
```

4. Now we can add some scripts to our `package.json`. There's one for starting the dev server, another to create a production build. A third script serves that production build for easy local testing:

```json
{
  "scripts": {
    "start": "wmr",
    "build": "wmr build",
    "serve": "wmr serve --http2"
  }
}
```

5. You're all set! As an extra step, if you want WMR to pre-render your application to static HTML when building for production, replace `render()` with [preact-iso](https://www.npmjs.com/package/preact-iso):

```diff
-import { render } from 'preact';
+import hydrate from 'preact-iso/hydrate';
 
function App() {
  return <h1>Hello World!</h1>;
}
 
-render(<App />, document.body);
+hydrate(<App />);

+export async function prerender(data) {
+  return (await import('preact-iso/prerender')).default(<App {...data} />);
+}
```

## Configuration and plugins

WMR supports a `wmr.config.js` (or `wmr.config.mjs`) configuration file.
You can export a config function, or individual config functions for each of the `start`, `build` and `serve` commands:

```js
// wmr.config.js
import someRollupPlugin from '@rollup/plugin-xyz';

/** @param {import('wmr').Options} config */
export default async function(config) {
  if (config.mode === 'build') {
    config.plugins.push(
      someRollupPlugin()
    );
  }
  
  if (config.mode === 'serve') {
    options.middleware.push(
      // add any Polka middleware
      (req, res, next) => {
        res.setHeader('X-Foo', 'bar');
        next();
      }
    );
  }
}
```

See [the full list of options](https://github.com/preactjs/wmr/blob/master/types.d.ts).

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
