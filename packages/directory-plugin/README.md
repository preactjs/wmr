# @wmr/directory-plugin

Allows you to import multiple files like this:

```js
import files from 'ls:./pages';
console.log(files); // ['home.js', 'about.js']
```

## Installation

```sh
yarn add @wmr/directory-plugin
## or
npm i --save @wmr/directory-plugin
```

## Usage

Enable the plugin by importing _(or pasting!)_ it into your `wmr.config.js`:

```js
import lsPlugin from '@wmr/directory-plugin';

export default function (config) {
	config.plugins.push(lsPlugin(config));
}
```

[Use it for automatic routes](https://github.com/preactjs/wmr/wiki/Configuration-Recipes#filesystem-based-routing--page-component-loading-)
