# @wmrjs/directory-import

Allows you to import multiple files like this:

```js
import files from 'dir:./pages';
console.log(files); // ['home.js', 'about.js']
```

## Installation

```sh
yarn add @wmrjs/directory-import
## or
npm i --save @wmrjs/directory-import
```

## Usage

Enable the plugin by importing _(or pasting!)_ it into your `wmr.config.js`:

```js
import { defineConfig } from 'wmr';
import directoryPlugin from '@wmrjs/directory-import';

export default defineConfig({
	plugins: [directoryPlugin()]
});
```

[Use it for automatic routes](https://github.com/preactjs/wmr/wiki/Configuration-Recipes#filesystem-based-routing--page-component-loading-)
