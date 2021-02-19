# @wmr/sw-plugin

Allows you to add a service-worker.

## Installation

```sh
yarn add @wmr/sw-plugin
## or
npm i --save @wmr/sw-plugin
```

## Usage

We'll have to start out by adding a simple Workbox-based service worker

```js
// public/sw.js
import { pageCache, staticResourceCache } from 'workbox-recipes';

pageCache();
staticResourceCache();
```

Then we use the special `sw:` prefix to import it and tell the plugin it's a service-worker

```js
// public/index.js
import swURL from 'sw:./sw.js';
navigator.serviceWorker.register(swURL);
```

And finally we'll add the plugin to our `wmr-config`.

```js
// wmr.config.js
import swPlugin from '@wmr/sw-plugin';

export default function (options) {
	swPlugin(options);
}
```
