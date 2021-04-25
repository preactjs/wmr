# preact-iso

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
