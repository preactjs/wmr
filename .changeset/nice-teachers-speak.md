---
'wmr': minor
---

Add support for private class fields which is a recent addition to JavaScript (currently Stage 3). We're adding it because it's supported in all major browsers natively.

```js
class Foo {
	#hi() {
		console.log('hellow');
	}
	greet() {
		this.#hi();
	}
}
new Foo().greet();
```
