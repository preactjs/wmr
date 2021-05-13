---
'wmr': minor
---

Deprecate "aliases" configuration in favor of "alias" to have a consistent name across various frontend tools. The "aliases" property will continue to work, but a deprecation warning will be printed to the console.

```diff
export default {
-	aliases: {
+	alias: {
		react: 'preact/compat'
	}
};
```
