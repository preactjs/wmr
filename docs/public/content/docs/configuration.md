---
nav: Configuration
title: 'Configuring WMR'
description: 'WMR supports Rollup plugins as well as extended Rollup plugins with WMR-specific features.'
---

## Config File

WMR will try to load configuration from `wmr.config.js`, `wmr.config.ts` or `wmr.config.mjs` if present. The config file is a regular JavaScript file that exports a default function.

CommonJS `wmr.config.js`:

```js
const { defineConfig } = require('wmr');

module.exports = defineConfig({
	// ...configuration
});
```

Node ES Modules, which can be activated by adding `"type": "module"` to `package.json` or by changing the file extension to `.mjs`):

```js
import { defineConfig } from 'wmr';

export default defineConfig({
	// ...configuration
});
```

TypeScript `wmr.config.ts`:

```js
import { defineConfig } from 'wmr';

export default defineConfig({
	// ...configuration
});
```

> The `defineConfig` function just aids with intellisense. It doesn't do anything at runtime and can be left out.

## Conditional configuration

Sometimes you need to use a different configuration depending on the kind of mode WMR is running in. This can be done by passing a callback function to `defineConfig()`:

```js
import { defineConfig } from 'wmr';

export default defineConfig(options => {
	if (options.mode === 'build') {
		return {
			// configuration specific to production builds
		};
	} else {
		return {
			// configuration specific to development
		};
	}
});
```

The callback function can be marked with `async` too, in case you need more complex setup logic.

```js
import { defineConfig } from 'wmr';

export default defineConfig(async options => {
	const result = await doSomethingAsync();

	if (result) {
		return {
			// ...configuration
		};
	} else {
		return {
			// ...configuration
		};
	}
});
```

## Options

### mode

- Type: `string`
- Default: `'start'` for development, `'build'` for production and `'serve'` if WMR is used as a plain file server

The mode WMR was started in.

### cwd

- Type: `string`
- Default: `process.cwd()/public/`

The main directory to serve files from.

### root

- Type: `string`
- Default: `process.cwd()`

The path to where WMR was launched from. Used to look up `package.json`.

### out

- Type: `string`
- Default: `process.cwd()/dist`

The directory to write files into when doing a production build via `wmr build`.

### host

- Type: `string`
- Default: `localhost`

The host to use when launching WMR in development mode (`start`) or as a file server (`serve`).

### port

- Type: `number`
- Default: `8080`

The host to use when launching WMR in development mode (`start`) or as a file server (`serve`).

### visualize

- Type: `boolean`
- Default: `false`

Render bundle size statistics into an interactive `stats.html` file after `wmr build`.

### debug

- Type: `boolean`
- Default: `false`

Print debugging messages intended for plugin authors to the terminal.

### Aliases

- Type: `{ string: string }`
- Default: `{}`

Alias npm modules to different ones or use path mappings to shorten import specifiers. Path mappings can be either relative or absolute paths. Every relative path is resolved against the directory the config file is placed in.

```js
import { defineConfig } from 'wmr';

export default defineConfig({
	aliases: {
		// Aliasing an npm module, in this case `react` to `preact/compat`
		react: 'preact/compat'
		// Aliasing `~` to a directory called `foo/`
		"~/*": './foo`
	}
});
```

> Note: By default `src` is added as an alias to `process.cwd()/src/`

### Plugins

- Type: `Plugin[]`
- Default: `[]`

Enhance WMR with custom plugins. Supports Rollup plugins out of the box.

```js
import { myCoolPlugin } from '@wmrjs/my-cool-plugin';
import { myOtherCoolPlugin } from '@wmrjs/my-other-cool-plugin';

export default defineConfig({
	plugins: [myCoolPlugin(), myOtherCoolPlugin()]
});
```

## Public Path

## Environment Variables
