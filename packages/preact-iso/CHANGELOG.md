# preact-iso

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
