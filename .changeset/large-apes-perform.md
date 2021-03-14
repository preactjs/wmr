---
'wmr': patch
---

Fix case where the module-graph would become stale if two co-dependent modules would import the same file, when this file would get updated we'd only cache-bust the import in one of those two files making the graph stale. One file updates the old version and the other updates the new one.
