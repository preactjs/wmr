---
"wmr": major
---

Rework prerendering API for tags in `document.head`. Previously the API is based on a subset of the actual `document.head` object. But in supplying a `document` global we rendered third party library checks invalid which usually use a variant of `typeof document === "undefined"` to determine if they're in a server environment or not. Since every library uses a different subset of the DOM API, it's impossible to support everyone. Instead using the server code paths of those libraries is a much more reliable approach.

Any tags that should land in `document.head` can be added to the return value of the `prerender` function:

```js
export async function prerender(data) {
  // ...do your prerendering here
  
  return {
    // The string that is put inside <body>
    html: "<h1>Hello world</h1>",
    head: {
      // sets document.title
      title: "My Cool Title",
      // Sets the lang attribute on the <html> element
      lang: "en",
      // Any element you want to put into document.head
      elements: [
        { type: "link", props: { rel: "stylesheet", href: "/path/to/my/style.css" } },
        { type: "meta", props: { property: "og:title", content: "Become an SEO Expert" } }
      ]
    }
  }
}

```
