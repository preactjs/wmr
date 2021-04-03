---
'wmr': minor
---

Rework internal path resolution to support aliasing via a plugin's `resolveId` hook and to support aliasing of directories via the built in alias config option. Only files that reside in one of the folders listed in `options.includeDirs` will be served.
