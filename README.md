# WMR

## Installation

```
npm i --save-dev wmr
## or
yarn add -D wmr
```

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

- [x] only 500kb disk usage, a single JS file
- [x] Hot Module Replacement for JavaScript modules
- [x] `import "deps"` from npm without installation
- [x] supports JSX with little/no overhead
- [x] hot-reloading for CSS (both imported and `<link>`)
- [x] import `*.module.css` for [CSS Modules](https://github.com/css-modules/css-modules)
- [x] serves static files
- [x] caches npm dependencies locally
- [ ] generates pruned `node_modules` directory based on usage
- [ ] generates optimized bundles for production serving

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
