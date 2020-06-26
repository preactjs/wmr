# WMR

## Installation

```
npm i --save-dev wmr
## or
yarn add -D wmr
```

> You can also use `npx wmr`.

## Setting up

First you'll need an `index.html` file containing your entry point, an example can be found in [the demo app](https://github.com/developit/wmr/blob/master/demo/public/index.html),
as you can see we have a script of type module that points to our `js` file.

Now we can add a script to our `package.json` to spin up the dev environment and one to build for production:

```json
{
  "scripts": {
    "start": "wmr",
    "build": "wmr build"
  }
}

```

### Features

- [x] wmr is a single JavaScript file with no dependencies
- [x] `import "deps"` from npm _without installation_
- [x] Hot Module Replacement for JavaScript modules
- [x] on-the-fly smart bundling of dependencies
- [x] built-in JSX support without the overhead
- [x] hot-reloading for CSS (both imports and `<link>` tags)
- [x] import `*.module.css` for [CSS Modules](https://github.com/css-modules/css-modules)
- [x] serves static files
- [x] caches installed and built npm dependencies locally
- [x] auto-populates `node_modules` progressively based on usage
- [x] `wmr build` generates optimized bundles for production
- [ ] no "entry points" or "pages" to configure

### Hacking

```sh
git clone git@github.com:developit/wmr.git
cd wmr
npm i

# run the demo (no compile)
npm run demo

# build the single-file CLI:
npm run build
```
