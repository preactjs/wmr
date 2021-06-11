---
'wmr': major
---

Fix swapped usage of `cwd` vs `root`. Now, `cwd` always refers to the current working directory and `root` the web root to serve from (= usually cwd+/public).

This change was done to reduce the amount of extra knowledge to be aware of when using WMR. It was a frequent source of confusion.

#### Migration guide:

If you used `options.cwd` or `options.root` in one of your plugins you need to swap them.
