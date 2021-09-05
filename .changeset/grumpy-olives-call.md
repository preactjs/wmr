---
'wmr': patch
---

Fix error when `plugins` or `middleware` array contains falsy values in the parsed configuration. This typically happens due to conditionally setting items. All falsy values are now filtered out by default.
