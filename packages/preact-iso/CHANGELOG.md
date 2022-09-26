# preact-iso

## 2.3.1

### Patch Changes

- [`2465fbb`](https://github.com/preactjs/wmr/commit/2465fbba9e0888d2191d0fbcf613b26e81b4640e) [#895](https://github.com/preactjs/wmr/pull/895) Thanks [@rschristian](https://github.com/rschristian)! - Fix lack of hydration when not returning prerender data

## 2.3.0

### Minor Changes

- [`22a8a18`](https://github.com/preactjs/wmr/commit/22a8a186fa45b64bb1349ba6998b12498d05d503) [#864](https://github.com/preactjs/wmr/pull/864) Thanks [@JoviDeCroock](https://github.com/JoviDeCroock)! - Add `onRouteChange` prop to the Router to observe synchronous route changes

### Patch Changes

- [`5780fc9`](https://github.com/preactjs/wmr/commit/5780fc929fa2bab222e3b3d11be2250aefe19cfe) [#864](https://github.com/preactjs/wmr/pull/864) Thanks [@JoviDeCroock](https://github.com/JoviDeCroock)! - Avoid calling onLoadEnd on every render

* [`69d291f`](https://github.com/preactjs/wmr/commit/69d291fbf2644b5c774672f4846f30e0e453af57) [#870](https://github.com/preactjs/wmr/pull/870) Thanks [@developit](https://github.com/developit)! - Fix `<Router>` accidentally un-rendering incoming routes that happen to resolve to the same component as the outgoing route.

## 2.2.0

### Minor Changes

- [`9a814a9`](https://github.com/preactjs/wmr/commit/9a814a95e76883254c3e9861170259ddd6d9ac0c) [#832](https://github.com/preactjs/wmr/pull/832) Thanks [@marvinhagemeister](https://github.com/marvinhagemeister)! - Add support for partial route matching via `/foo/*`

* [`439768e`](https://github.com/preactjs/wmr/commit/439768e6ef3e0a69fe872196f2b3f05bd3bbfcb6) [#835](https://github.com/preactjs/wmr/pull/835) Thanks [@marvinhagemeister](https://github.com/marvinhagemeister)! - Add support for nested routes matching

### Patch Changes

- [`21bbeb9`](https://github.com/preactjs/wmr/commit/21bbeb9a9a58e2c3c59f9db2cec1c651e5bbf5f8) [#831](https://github.com/preactjs/wmr/pull/831) Thanks [@marvinhagemeister](https://github.com/marvinhagemeister)! - Fix `preact-iso` intercepting `cmd/ctrl+click` and other native browser behaviors.

## 2.1.0

### Minor Changes

- [`c963fbe`](https://github.com/preactjs/wmr/commit/c963fbec5cac7d45a65ffa9cd05d937e56fc5aa6) [#586](https://github.com/preactjs/wmr/pull/586) Thanks [@developit](https://github.com/developit)! - Pass route paramters as props when no prop exists with that name.

* [`095ddde`](https://github.com/preactjs/wmr/commit/095dddefbb5b56d0a897716513977a99f38665bf) [#824](https://github.com/preactjs/wmr/pull/824) Thanks [@developit](https://github.com/developit)! - - Bugfix for Router: "splat" parameters (`/:x*` and `/:y*`) should be passed in the `params` prop instead of directly on props

## 2.0.3

### Patch Changes

- [`62840d8`](https://github.com/preactjs/wmr/commit/62840d82eddf1bda9447c08750fe6886751edee7) [#665](https://github.com/preactjs/wmr/pull/665) Thanks [@rschristian](https://github.com/rschristian)! - Removing unused imports (and associated console warnings) in preact-iso

## 2.0.2

### Patch Changes

- [`c1f3f0e`](https://github.com/preactjs/wmr/commit/c1f3f0e42a053811fe894f91a7bd702247e550d5) [#608](https://github.com/preactjs/wmr/pull/608) Thanks [@marvinhagemeister](https://github.com/marvinhagemeister)! - Fix `useRoute` missing in main entry exports

## 2.0.1

### Patch Changes

- [`79c7fd6`](https://github.com/preactjs/wmr/commit/79c7fd6a5cd46904779a630ac42207e9bf918f1c) [#594](https://github.com/preactjs/wmr/pull/594) Thanks [@developit](https://github.com/developit)! - Fixes a race condition in preact-iso `Router` by registering the link click handler immediately.

## 2.0.0

### Major Changes

- [`8e8690a`](https://github.com/preactjs/wmr/commit/8e8690afee44e6d2bb83201ec3b283a89331995b) [#557](https://github.com/preactjs/wmr/pull/557) Thanks [@marvinhagemeister](https://github.com/marvinhagemeister)! - Fix route params being able to overwrite route context. This is a breaking change in that params no need to be pulled off a `params` object instead of accessing it directly

### Patch Changes

- [`8a44d75`](https://github.com/preactjs/wmr/commit/8a44d756ccb72d32c36e6ed03d618462dd8a6ba3) [#571](https://github.com/preactjs/wmr/pull/571) Thanks [@developit](https://github.com/developit)! - preact-iso: fix ErrorBoundary pushing invalid callback into commit queue

* [`6f93a06`](https://github.com/preactjs/wmr/commit/6f93a06bb2065e5fef15eb4f2bfffbd07bcc616d) [#567](https://github.com/preactjs/wmr/pull/567) Thanks [@marvinhagemeister](https://github.com/marvinhagemeister)! - Update preact/iso TypeScript types

- [`c7ca0a4`](https://github.com/preactjs/wmr/commit/c7ca0a436bfe99ff9d8d15dbad6b111cae40f799) [#555](https://github.com/preactjs/wmr/pull/555) Thanks [@marvinhagemeister](https://github.com/marvinhagemeister)! - Fix crash when passing dynamic arrays as children. This was caused by missing children normalization.

## 1.2.0

### Minor Changes

- [`a7e79c9`](https://github.com/preactjs/wmr/commit/a7e79c9759ec87983bceb83819b5c8387299c867) [#530](https://github.com/preactjs/wmr/pull/530) Thanks [@developit](https://github.com/developit)! - `<Router>` is now an async boundary (it handles `lazy()` descendants by itself), and supports cancellable + stacked route transitions.

### Patch Changes

- [`8d5d1d8`](https://github.com/preactjs/wmr/commit/8d5d1d82d98c7f2e2eaccb92ff6890cf1e2e6139) [#534](https://github.com/preactjs/wmr/pull/534) Thanks [@developit](https://github.com/developit)! - [preact-iso] Support setting a manual URL via `<LocationProvider url="/" />`

## 1.1.1

### Patch Changes

- [`2d0bb8a`](https://github.com/preactjs/wmr/commit/2d0bb8a64783c32cfdaad05563b6293649059ef9) [#504](https://github.com/preactjs/wmr/pull/504) Thanks [@developit](https://github.com/developit)! - Bugfix: fix route flashing for routes that render fragments

* [`321dfce`](https://github.com/preactjs/wmr/commit/321dfced389800e661174e1e304fa8ecab593f96) [#496](https://github.com/preactjs/wmr/pull/496) Thanks [@developit](https://github.com/developit)! - [preact-iso] Router: reset page scroll position on forward navigations

- [`c07c39f`](https://github.com/preactjs/wmr/commit/c07c39fba101e34e673997262f71f80a8488b6d6) [#505](https://github.com/preactjs/wmr/pull/505) Thanks [@developit](https://github.com/developit)! - [preact-iso] Prevent the router from intercepting clicks on anchor links

* [`764830f`](https://github.com/preactjs/wmr/commit/764830fde981e60f67fbc74f7e5b46dcbc98d573) [#493](https://github.com/preactjs/wmr/pull/493) Thanks [@developit](https://github.com/developit)! - [preact-iso] Prevent the Router from intercepting clicks on links with an "external" target (`target="anything"`).

## 1.1.0

### Minor Changes

- [`44d5a83`](https://github.com/preactjs/wmr/commit/44d5a835aa08fc4e4497706045ce26ba13108b0a) [#461](https://github.com/preactjs/wmr/pull/461) Thanks [@piotr-cz](https://github.com/piotr-cz)! - Fix Eslint and Prettier suggestions

* [`f7b5bd7`](https://github.com/preactjs/wmr/commit/f7b5bd77c3d0e599cff43226f903483cefad9539) [#422](https://github.com/preactjs/wmr/pull/422) Thanks [@rschristian](https://github.com/rschristian)! - Adds a new Route component export

### Patch Changes

- [`5ff2c55`](https://github.com/preactjs/wmr/commit/5ff2c559feb83ffed514ed67b5d7f3e2389ef5cc) [#459](https://github.com/preactjs/wmr/pull/459) Thanks [@marvinhagemeister](https://github.com/marvinhagemeister)! - Add missing Route export

* [`0833c4a`](https://github.com/preactjs/wmr/commit/0833c4ad25ceffae461d4d8f8643744cc0b7e080) [#408](https://github.com/preactjs/wmr/pull/408) Thanks [@piotr-cz](https://github.com/piotr-cz)! - Add type definitions to router onLoadEnd and onLoadStart

- [`f320e3e`](https://github.com/preactjs/wmr/commit/f320e3e46cbd66c4d0580c6ec567e335b646ac5c) [#416](https://github.com/preactjs/wmr/pull/416) Thanks [@JoviDeCroock](https://github.com/JoviDeCroock)! - Fix routes with leading/trailing slashes

* [`3db3696`](https://github.com/preactjs/wmr/commit/3db36964afc1f3158d3b5d377d06ccf32b6efadd) [#421](https://github.com/preactjs/wmr/pull/421) Thanks [@marvinhagemeister](https://github.com/marvinhagemeister)! - Add missing types for `onError` prop of `ErrorBoundary` component

- [`0bbb8cc`](https://github.com/preactjs/wmr/commit/0bbb8ccaafb1182b5a0f42ef6208a40d774c73f1) [#424](https://github.com/preactjs/wmr/pull/424) Thanks [@piotr-cz](https://github.com/piotr-cz)! - Set default value for push to true

## 1.0.1

### Patch Changes

- [`58f1bff`](https://github.com/preactjs/wmr/commit/58f1bffd108f45c1ac5759f744f484b5d6a8fcca) [#364](https://github.com/preactjs/wmr/pull/364) Thanks [@developit](https://github.com/developit)! - Fixes a bug introduced in 1.0.0 where Router would duplicate DOM when hydrating `lazy()` components.

* [`ee75298`](https://github.com/preactjs/wmr/commit/ee752988a190ca3ac34c8614b7ac8c8d4d5a5062) [#368](https://github.com/preactjs/wmr/pull/368) Thanks [@piotr-cz](https://github.com/piotr-cz)! - Fix hydrate parent definition

## 1.0.0

### Major Changes

- [`c681137`](https://github.com/preactjs/wmr/commit/c681137b29ec521dcec050cba58ed24089629f1b) [#359](https://github.com/preactjs/wmr/pull/359) Thanks [@JoviDeCroock](https://github.com/JoviDeCroock)! - Remove deprecated `useLoc` export

### Minor Changes

- [`fab59f8`](https://github.com/preactjs/wmr/commit/fab59f88ecf2b6d2085941a4f92ccd3c78684738) [#354](https://github.com/preactjs/wmr/pull/354) Thanks [@JoviDeCroock](https://github.com/JoviDeCroock)! - Support route params and inject them into the rendered route, add the `useRoute` hook so we can retrieve route parameters from anywhere in the subtree.

### Patch Changes

- [`438be29`](https://github.com/preactjs/wmr/commit/438be293346c969384a57f3cfa31931f2722ea5a) [#337](https://github.com/preactjs/wmr/pull/337) Thanks [@cristianbote](https://github.com/cristianbote)! - Show the previous route only for the unresolved thrown routes
