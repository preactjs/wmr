---
nav: 'Plugin API'
title: 'Plugin API'
---

This document describes the methods of plugins in WMR. If you're unsure how plugins work, check out the [plugins](/docs/plugins) overview page.

## Common properties & methods

### name

- Type: `string`

The name of your plugin, that will be shown in logs, warnings and errors.

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
      return "my-other-virtual-module`;
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
