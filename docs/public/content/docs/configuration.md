---
nav: Configuration
title: 'Configuring WMR'
description: 'WMR supports Rollup plugins as well as extended Rollup plugins with WMR-specific features.'
---

## Config File

WMR will try to load configuration from `wmr.config.js`, `wmr.config.ts` or `wmr.config.mjs` if present. The config file is a regular JavaScript file that exports a default function.

CommonJS `wmr.config.js`:

```js
module.exports = function (options) {
	// ...configuration
};
```

Node ES Modules `wmr.config.mjs` or TypeScript `wmr.config.ts`:

```js
export default function (options) {
	// ...configuration
}
```

## Aliases

## Public Path

## Environment Variables
