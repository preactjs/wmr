# preact-iso

Isomorphic async tools for Preact.

- Lazy-load components using `lazy()` and `<ErrorBoundary>`, which also enables progressive hydration.
- Generate static HTML for your app using `prerender()`, waiting for `lazy()` components and data dependencies.
- Implement async-aware client and server-side routing using `<Router>`, including seamless async transitions.

### `lazy.js`

Make a lazily-loaded version of a Component.
`lazy()` takes an async function that resolves to a Component, and returns a wrapper version of that Component. The wrapper component can be rendered right away, even though the component is only loaded the first time it is rendered.

```js
import { render } from 'preact';
import { lazy, ErrorBoundary } from 'preact-iso/lazy';
import { Router } from 'preact-iso/router';

// Synchronous, not code-splitted:
// import Home from './routes/home.js';
// import Profile from './routes/profile.js';

// Asynchronous, code-splitted:
const Home = lazy(() => import('./routes/home.js'));
const Profile = lazy(() => import('./routes/profile.js'));

const App = () => (
	<ErrorBoundary>
		<Router>
			<Home path="/" />
			<Profile path="/profile" />
		</Router>
	</ErrorBoundary>
);

render(<App />, document.body);
```

### `prerender.js`

`prerender()` renders a Virtual DOM tree to an HTML string using [preact-render-to-string](https://github.com/preactjs/preact-render-to-string). The difference is that it is asynchronous, and waits for any Promises thrown by components during rendering (Suspense-style) to resolve before returning the HTML. Nested promises also work, and the maximum depth can be controlled using the `maxDepth` option, which defaults to `10`.

The Promise returned from `prerender()` resolves to an Object with `html` and `links[]` properties. The `html` property contains your pre-rendered static HTML markup, and `links` is an Array of any non-external URL strings found in links on the generated page.

```js
import { lazy, ErrorBoundary } from 'preact-iso/lazy';
import prerender from 'preact-iso/prerender';

// Asynchronous (throws a promise)
const Foo = lazy(() => import('./foo.js'));

const App = () => (
	<ErrorBoundary>
		<Foo path="/" />
	</ErrorBoundary>
);

const { html, links } = await prerender(<App />, { maxDepth: 10 });
```

### `hydrate.js`

`hydrate()` is a thin wrapper around Preact's hydrate() method. It performs hydration when the HTML for the current page includes pre-rendered output from `prerender()`. It falls back to plain rendering in any other cases, which is useful if you're not pre-rendering during development. This method also checks to make sure its running in a browser context before attempting any rendering - if not, it does nothing.

```js
import hydrate from 'preact-iso/hydrate';

const App = () => (
	<div class="app"><h1>Hello World</h1></div>
);

hydrate(<App />);
```

### `router.js`

A simple router for Preact with conventional and hooks-based APIs. The `<Router>` component is async-aware: when transitioning from one route to another, if the incoming route suspends (throws a Promise), the outgoing route is preserved until the new one becomes ready.

```js
import { lazy, ErrorBoundary } from 'preact-iso/lazy';
import { LocationProvider, Router, useLoc } from 'preact-iso/router';

// Asynchronous (throws a promise)
const Home = lazy(() => import('./routes/home.js'));
const Profile = lazy(() => import('./routes/profile.js'));

const App = () => (
	<LocationProvider>
		<ErrorBoundary>
			<Router>
				<Home path="/" />
				<Profile path="/profile" />
			</Router>
		</ErrorBoundary>
	</LocationProvider>
);
```

During prerendering, the generated HTML includes our full `<Home>` and `<Profile>` component output because it waits for the `lazy()`-wrapped `import()` to resolve.

**Progressive Hydration:** When the app is hydrated on the client, the route (`Home` or `Profile` in this case) suspends. This causes hydration for that part of the page to be deferred until the route's `import()` is resolved, at which point that part of the page automatically finishes hydrating.

**Seamless Routing:** Switch switching between routes on the client, the Router is aware of asynchronous dependencies in routes. Instead of clearing the current route and showing a loading spinner while waiting for the next route (or its data), the router preserves the current route in-place until the incoming route has finished loading, then they are swapped.
