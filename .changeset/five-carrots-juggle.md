---
'wmr': patch
---

Fix reload issue, when the bubbling hmr doesn't find a proper boundary it will give the browser a refresh signal (F5) which needs to clear the module-graph as modules could still be marked as stale which wouldn't be needed
