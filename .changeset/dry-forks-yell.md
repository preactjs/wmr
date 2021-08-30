---
"wmr": patch
---

Fix complex `process.env` usage (ex: `let {A}=process.env`, but not `process.env.A`) generating invalid code.
