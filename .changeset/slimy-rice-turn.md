---
'wmr': minor
---

Add support for [import assertions](https://github.com/tc39/proposal-import-assertions) syntax that is very likely to come in an upcoming version of JavaScript. Import Assertions are a native way to load non-js files in ESM environments.

```js
import foo from './foo.json' assert { type: 'json' };
```

At the time of this writing this is only supported in Chrome, so we'll downtranspile import assertions to leverage loaders. This allows the code to run all browsers WMR supports.
