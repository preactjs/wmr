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
import directoryPlugin from '@wmrjs/directory-import';

export default function (config) {
	directoryPlugin(config);
}
```

[Use it for automatic routes](https://github.com/preactjs/wmr/wiki/Configuration-Recipes#filesystem-based-routing--page-component-loading-)
