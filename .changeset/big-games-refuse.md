---
'wmr': minor
---

Update plugin format to extend options by deep-merging return values instead of manually pushing into arrays. This makes user plugins shorter and less error prone. In doing so we do support return an array of plugins from a plugin. The returned array will be flattened into the existing one. To be able to specify execution points a `plugin.enforce` property was added.
