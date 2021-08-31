---
'wmr': patch
---

Fix incorrectly transformed dynamic import statements when there was a comment in front of the specifier (`import(/* foo */ 'my-module')`)
