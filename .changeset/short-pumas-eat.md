---
'wmr': patch
---

Resolve a wrongly replaced `process.env` variable when a binding with the name `process` is already in scope. This was encountered when bundling vscode's monaco-editor.
