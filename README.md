# WMR

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
