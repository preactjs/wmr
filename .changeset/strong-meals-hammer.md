---
'wmr': major
---

**tl;dr:** Auto-installation of npm packages is not enabled by default anymore and has to be opt-in to via `--autoInstall` on the CLI.

The npm integration in WMR was rewritten from the ground up to support the following new features:

- Reduce amount of requests by prebundling npm packages
- Resolve the `browser` field in `package.json`
- Resolve the `exports` field in `package.json`
- Improve CommonJS handling by attempting to convert it to ESM
- Ensure reproducible builds by moving auto installing of npm packages behind a CLI flag (`--autoInstall`)
- Allow specifying the url of the npm registry to fetch from when `--autoInstall` is active. This can be done via `--registry URL_TO_MY_REGISTRY`
