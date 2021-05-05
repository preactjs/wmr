---
'wmr': minor
---

Add support for importing files outside of the main public directory. This feature is based on aliases and `<project>/src` is added by default. To prevent unexpected file access only the directories defined in the aliases and the public directory are allowed to read files from. To alias a new path add the following to your WMR configuration file:

```js
// File: wmr.config.mjs
import { defineConfig } from 'wmr';

export default defineConfig({
	aliases: {
		// This will alias "~" to "<project>/src/components/"
		'~/': './src/components/'
	}
});
```
