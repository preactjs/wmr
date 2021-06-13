---
'wmr': major
---

Completely rewrite our stylesheet pipeline. All CSS files can now be intercepted from plugins allowing us to leverage the same pipeline that we use for production during development.

- Fixes `.scss/.sass` not compiled on watch
- Fixes nested `.scss/.sass` files not compiled with sass
- Fixes `.scss/.sass` files not compiled when directly referenced in HTML
- Fixes asset caching overwriting each others entries
- Adds groundwork for intercepting urls inside css for aliasing or resolving from `node_modules`
