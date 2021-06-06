---
nav: Plugins & Ecosystem
title: 'Plugins and Ecosystem Components'
description: 'WMR supports Rollup plugins as well as extended Rollup plugins with WMR-specific features.'
---

Plugins allow you to extend the functionality of WMR. They allow you to add support for new file types, loaders, build hooks and much more. The plugin architecture in WMR mirrors the one used in the [Rollup](https://rollupjs.org/guide/en/#plugin-development) bundler.

## Overview

To be able to load a virtual module named `virtual-module` we need to extend WMR with a custom plugin. Plugins can be roughly devided into three stages that are always executed in the same order:

1. **Resolution:** Import specifiers are resolved to their final destination (e.g. `react` -> `preact/compat`)
2. **Loading:** Retrieve the source code content for the resolved import specifier. In most cases this is equivalent to reading a file from disk.
3. **Transformation:** Modify the source code, like transforming JSX to valid JavaScript

In our case we'll be exporting a plain string from our virtual module, so we can skip the transformation phase.

```js
// my-example-plugin.mjs
export function MyExamplePlugin() {
	return {
		// Will be used in logs, warnings, errors, etc.
		name: 'my-example',
		// Called when resolving an import specifier
		resolveId(id) {
			if (id === 'virtual-module') {
				// Signals that no other plugin should continue to
				// resolve this id
				return id;
			}
		},
		// "load" the source code of our virtual module
		load(id) {
			if (id === 'virtual-module') {
				return 'export default "This is virtual!"';
			}
		}
	};
}
```

To activate our plugin we'll add it to the `plugins` array in our config file.

```js
// wmr.config.mjs
import { defineConfig } from 'wmr';
import { MyExamplePlugin } from './my-example-plugin';

export default defineConfig({
	plugins: [MyExamplePlugin()]
});
```

That's it! Now we can import from `virtual-module` in our application:

```js
import message from 'virtual-module';

console.log(message);
// Logs: "This is virtual!"
```

## Plugin Presets

Sometimes we want to share a collection of plugins as one for better developer UX. These are referred to as presets and are often used to add support for a specific framework compilation pipeline.

To do that WMR allows you to return an array of plugins instead of returning the plugin directly.

```js
function MyPreset() {
	return [pluginA(), pluginB()];
}
```

## Official Plugins

- [directory import](https://github.com/preactjs/wmr/tree/main/packages/directory-plugin)
- [module/nomodule plugin](https://github.com/preactjs/wmr/tree/main/packages/nomodule-plugin)
- [Service Worker](https://github.com/preactjs/wmr/tree/main/packages/sw-plugin)

## Community Plugins

- [Vue plugin](https://github.com/Elliotclyde/wmr-vue-plugin)
