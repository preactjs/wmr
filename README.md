# WMR

<img src="./docs/public/assets/wmr.svg" alt="wmr logo" width="400">

[![npm](https://img.shields.io/npm/v/wmr.svg)](http://npm.im/wmr)
[![install size](https://packagephobia.com/badge?p=wmr)](https://packagephobia.com/result?p=wmr)
[![OpenCollective Backers](https://opencollective.com/preact/backers/badge.svg)](#backers)
[![OpenCollective Sponsors](https://opencollective.com/preact/sponsors/badge.svg)](#sponsors)

**The tiny all-in-one development tool for modern web apps**, in a single 2mb file with no dependencies.

All the features you'd expect and more, from development to production:

🔨 &nbsp; No entry points or pages to configure - just HTML files with `<script type=module>`<br>
🦦 &nbsp; Safely `import "packages"` from npm **_without installation_**<br>
📦 &nbsp; Smart bundling and caching for npm dependencies<br>
↻ &nbsp; Hot reloading for modules, Preact components and CSS<br>
⚡️ &nbsp; Lightning-fast JSX support that you can debug in the browser<br>
💄 &nbsp; Import CSS files and [CSS Modules](https://github.com/css-modules/css-modules) (`*.module.css`)<br>
🔩 &nbsp; Out-of-the-box support for [TypeScript](https://www.typescriptlang.org/)<br>
📂 &nbsp; Static file serving with hot reloading of CSS and images<br>
🗜 &nbsp; Highly optimized Rollup-based production output (`wmr build`)<br>
📑 &nbsp; Crawls and pre-renders your app's pages to static HTML at build time<br>
🏎 &nbsp; Built-in HTTP2 in dev and prod (`wmr serve --http2`)<br>
🔧 &nbsp; Supports [Rollup plugins](packages/wmr/README.md#configuration-and-plugins), even in development where Rollup isn't used

## Quickstart _(recommended)_

Create a new project in seconds using [create-wmr](https://npm.im/create-wmr):

<strong><code>npm init wmr your-project-name</code></strong>

or

<strong><code>yarn create wmr your-project-name</code></strong>

<p>
<img width="400" src="https://user-images.githubusercontent.com/105127/100917537-4661e100-34a5-11eb-89bd-565b7bc31919.gif" alt="illustration of installation to build for wmr">
</p>

> 💁 If you'd like ESLint to be set up for you, add `--eslint` to the command. _Note: this will use 150mb of disk space._

[Check out the docs to learn more](https://wmr.dev/docs)

## Packages

| Package                                              | Description                                              | Version                                                                                                                            |
| ---------------------------------------------------- | :------------------------------------------------------- | :--------------------------------------------------------------------------------------------------------------------------------- |
| [wmr](packages/wmr)                                  | Tiny all-in-one development tool for modern web apps     | [![wmr npm](https://img.shields.io/npm/v/wmr.svg)](https://npm.im/wmr)                                                             |
| [create-wmr](packages/create-wmr)                    | Create a new WMR project in seconds                      | [![create-wmr npm](https://img.shields.io/npm/v/create-wmr.svg)](https://npm.im/create-wmr)                                        |
| [@wmrjs/directory-import](packages/directory-plugin) | Import a directory's files as an Array                   | [![@wmrjs/directory-import npm](https://img.shields.io/npm/v/@wmrjs/directory-import.svg)](https://npm.im/@wmrjs/directory-import) |
| [@wmrjs/nomodule](packages/nomodule-plugin)          | Generate legacy fallback bundles for older browsers      | [![@wmrjs/nomodule npm](https://img.shields.io/npm/v/@wmrjs/nomodule.svg)](https://npm.im/@wmrjs/nomodule)                         |
| [@wmrjs/service-worker](packages/sw-plugin)          | Bundle service workers                                   | [![@wmrjs/service-worker npm](https://img.shields.io/npm/v/@wmrjs/service-worker.svg)](https://npm.im/@wmrjs/service-worker)       |
| [preact-iso](packages/preact-iso)                    | Optimal code-splitting, hydration and routing for Preact | [![preact-iso npm](https://img.shields.io/npm/v/preact-iso.svg)](https://npm.im/preact-iso)                                        |

## Contributing

```sh
git clone git@github.com:preactjs/wmr.git
cd wmr
yarn

# run the demo (no compile)
yarn demo serve

# build and serve the demo for prod
yarn demo build:prod && yarn demo serve:prod

# build the single-file CLI:
yarn workspace wmr build
```

### Adding a changeset

Don't forget to also include a changeset, by running this command at the root of the project:

```sh
yarn changeset
```

This will take you through a process of selecting the changed packages, the version updates and a description of the change. Afterwards, `changesets`, will generate a `.md` file inside a `.changeset` directory. Please commit that file as well.

After all that, you are good to go. :+1:
