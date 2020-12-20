# `@wmr-plugins/nomodule`

WMR outputs modern JavaScript bundles by default.
This plugin creates legacy versions of your bundles using [@babel/preset-env](https://babeljs.io/docs/en/babel-preset-env) and serves those versions to older browsers.

New browsers get the new stuff, old browsers get the old stuff.

## Usage

Add this to your `wmr.config.mjs`:

```js
import nomodule from '@wmr-plugins/nomodule';

export function build(config) {
  nomodule(config);
}
```
