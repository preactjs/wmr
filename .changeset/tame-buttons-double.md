---
'wmr': minor
---

Adds new config option for specifying additional links to prerender in your WMR configuration file.

```js
// wmr config
import { defineConfig } from 'wmr';

export default defineConfig({
	customRoutes: ['/foo/bar', '/my-other-route', '/rss.xml']
});
```
