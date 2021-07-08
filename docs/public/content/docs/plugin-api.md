---
nav: 'Plugin API'
title: 'Plugin API'
---

WMR plugins use the standard [Rollup plugin methods](https://rollupjs.org/guide/en/#plugin-development) along with a few additional WMR-specific extensions described below. For a broad overview of how plugins work, check out the [plugins overview](/docs/plugins) page.

## Common properties & methods

### name

- Type: `string`

The name of your plugin, that will be shown in logs, warnings and errors.

### enforce

- Type: `"pre" | "post" | "normal"`
- Default: `"normal"`

Defines the order of execution for plugins. Plugins with an `enforce: "pre"` property are executed first before all others. Next up are plugins with `enforce: "normal"` or no enforce property present. This is followed by WMR's internal plugins and lastly plugins with `enforce: "post"` are called.

1. Plugins with `enforce: "pre"`
2. Plugins with `enforce: "normal"` or no enforce property
3. WMR internal plugins
4. Plugins with `enforce: "post"`

Example:

```js
const myPlugin = {
	name: 'my-plugin',
	enforce: 'pre'
	// ...
};
```

### config(config)

- `config`: WMR's current configuration object

Use this hook if your plugin needs to change some configuration like setting up additional aliases for example. The return value will be merged into the config object.

```js
const myPlugin = {
	name: 'my-plugin',
	config(config) {
		return {
			alias: {
				'my-foo/*', 'my-plugin-folder'
			}
		}
	}
	// ...
};
```

### configResolved(config)

- `config`: WMR's current configuration object

This hook is called right after [`config()`](#config). Use this hook to query the final WMR configuration in your plugin. A typical scenarios where this is needed is different plugin logic based on the build mode.

```js
function MyPlugin() {
	let options;

	return {
		name: 'my-plugin',
		configResolved(config) {
			options = config;
		},
		load(id) {
			if (options.mode === 'build') {
				// Apply logic only on production builds
			} else {
				// Apply logic only on development builds
			}
		}
	};
}
```

### resolveId(id, importer)

- `id`: Requested import specifier like `../foo.js`
- `importer`: Parent module of the current file (optional)

The `resolveId` function is called whenever an import specifier is encountered. All resolution concerns, like rewriting a file path to another, should be done here.

```js
{
  name: "my-plugin",
  resolveId(id) {
    if (id === "virtual-module") {
      // Rewrite `virtual-module` to `my-other-virtual-module`
      return "my-other-virtual-module";
    }
  }
}
```

The most common case though is to prevent other plugins from continuing resolution. This is implied by returning a value.

```js
function MyPlugin() {
	return {
		name: 'my-plugin',
		resolveId(id) {
			if (id === 'virtual-module') {
				return id;
			}
		}
	};
}
```

We can allow other plugins to continue resolution recursively by triggering the resolve step.

```js
function MyPlugin() {
	return {
		name: 'my-plugin',
		async resolveId(id, importer) {
			if (id === 'virtual-module') {
				const resolved = await this.resolve(
					id,
					importer,
					// Don't call ourselves again to prevent an infinite loop
					{ skipSelf: true }
				);

				return resolved;
			}
		}
	};
}
```

### load(id)

- `id`: The import specifier that should be loaded

The `load` method will be called after the import specifier has been resolved. It's now up to the `load` method to retrieve the actual source code for that file.

```js
function MyPlugin() {
	return {
		name: 'my-plugin',
		load(id) {
			if (id === 'virtual-module') {
				return `export default "This is virtual"`;
			}
		}
	};
}
```

> The default behavior is to load the resolved file from disk. So this method is only neccessary when you're loading a virtual module.

### transform(content, id)

- `content`: The content of the module
- `id`: The id of the module that is transformed

This method allows you to transform the source code further, before passing it to WMR. It will be called after [`load()`](#load-id) or after another plugin's `transform()` invokation.

```js
function MyPlugin() {
	return {
		name: 'my-plugin',
		// Note, can be async too
		transform(code, id) {
			// Do your custom transformation here
			const generated = doSomeTransformation(code);

			return {
				code: generated.code,
				map: generated.sourceMap
			};
		}
	};
}
```
