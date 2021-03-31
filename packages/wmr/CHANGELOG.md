# wmr

## 1.5.0

### Minor Changes

- [`89b402e`](https://github.com/preactjs/wmr/commit/89b402e64d03850998899a74ecc62ba55eef030b) [#508](https://github.com/preactjs/wmr/pull/508) Thanks [@rschristian](https://github.com/rschristian)! - Adds a bundle visualizer to WMR

### Patch Changes

- [`483601f`](https://github.com/preactjs/wmr/commit/483601f80d045728d8c037009f263293de4ac213) [#498](https://github.com/preactjs/wmr/pull/498) Thanks [@developit](https://github.com/developit)! - Bugfix: Fix a crash when prerendering encounters an error, and show pretty-printed stack traces instead.

* [`f15a0c5`](https://github.com/preactjs/wmr/commit/f15a0c52b59395129edd8660cda8bbf12354157a) [#500](https://github.com/preactjs/wmr/pull/500) Thanks [@developit](https://github.com/developit)! - Bugfix: fixes a crash when initializing Chokidar on some systems

## 1.4.2

### Patch Changes

- [`0c71e36`](https://github.com/preactjs/wmr/commit/0c71e36c23596fdd789be41fd5e8720d90e7ed4c) [#491](https://github.com/preactjs/wmr/pull/491) Thanks [@developit](https://github.com/developit)! - Bugfix: correctly invoke registered plugins when there are no plugins with `{enforce:"post"}` present.

## 1.4.1

### Patch Changes

- [`22d0915`](https://github.com/preactjs/wmr/commit/22d0915029ccc5a0b0cdf4b7338e8d511d600a8b) [#479](https://github.com/preactjs/wmr/pull/479) Thanks [@marvinhagemeister](https://github.com/marvinhagemeister)! - Use the same ordering of internal plugins in dev and prod

## 1.4.0

### Minor Changes

- [`cb26519`](https://github.com/preactjs/wmr/commit/cb2651974c922c10c520a1c56de39ac3c2b05511) [#438](https://github.com/preactjs/wmr/pull/438) Thanks [@marvinhagemeister](https://github.com/marvinhagemeister)! - Update plugin format to extend options by deep-merging return values instead of manually pushing into arrays. This makes user plugins shorter and less error prone. In doing so we do support return an array of plugins from a plugin. The returned array will be flattened into the existing one. To be able to specify execution points a `plugin.enforce` property was added.

* [`5dcd256`](https://github.com/preactjs/wmr/commit/5dcd256d5584149fcd26358aa6afa6dfa5a289fb) [#476](https://github.com/preactjs/wmr/pull/476) Thanks [@marvinhagemeister](https://github.com/marvinhagemeister)! - Automatically restart the dev server on config changes. This includes `package.json`, `*.env` and `wmr.config.(js|ts|mjs)`

- [`eed537d`](https://github.com/preactjs/wmr/commit/eed537df6f4a8bb55e822b4645278beee366b07c) [#435](https://github.com/preactjs/wmr/pull/435) Thanks [@JoviDeCroock](https://github.com/JoviDeCroock)! - Report errored JS-lines to the client.

* [`44d5a83`](https://github.com/preactjs/wmr/commit/44d5a835aa08fc4e4497706045ce26ba13108b0a) [#461](https://github.com/preactjs/wmr/pull/461) Thanks [@piotr-cz](https://github.com/piotr-cz)! - Fix Eslint and Prettier suggestions

- [`111c1be`](https://github.com/preactjs/wmr/commit/111c1be36cc27428df72d4e73964157c90218d82) [#389](https://github.com/preactjs/wmr/pull/389) Thanks [@JoviDeCroock](https://github.com/JoviDeCroock)! - Use resolve.exports for export map resolving in the npm-plugin

### Patch Changes

- [`c906736`](https://github.com/preactjs/wmr/commit/c9067365aaf2c2e1480ac001631ffeaad826e045) [#475](https://github.com/preactjs/wmr/pull/475) Thanks [@marvinhagemeister](https://github.com/marvinhagemeister)! - Only search for free port once in dev mode

* [`d37fe5c`](https://github.com/preactjs/wmr/commit/d37fe5cf3ed19422e623c8eb556667d8de052f76) [#464](https://github.com/preactjs/wmr/pull/464) Thanks [@marvinhagemeister](https://github.com/marvinhagemeister)! - Always print stack traces on exceptions

- [`b225cc2`](https://github.com/preactjs/wmr/commit/b225cc24a5683380b26e48ff8f276b1f2e2525d2) [#430](https://github.com/preactjs/wmr/pull/430) Thanks [@JoviDeCroock](https://github.com/JoviDeCroock)! - Fix reload issue, when the bubbling hmr doesn't find a proper boundary it will give the browser a refresh signal (F5) which needs to clear the module-graph as modules could still be marked as stale which wouldn't be needed

* [`07dbd20`](https://github.com/preactjs/wmr/commit/07dbd20f8dcbbc3c19fedf8a9bdd2396b194c474) [#470](https://github.com/preactjs/wmr/pull/470) Thanks [@marvinhagemeister](https://github.com/marvinhagemeister)! - Fix potential infinite loop when searching for a free port

- [`f45c651`](https://github.com/preactjs/wmr/commit/f45c65172a36f738e511da068d2c5f4b63b2d504) [#472](https://github.com/preactjs/wmr/pull/472) Thanks [@marvinhagemeister](https://github.com/marvinhagemeister)! - Reduce amount of files to check during config loading

* [`3fa2aeb`](https://github.com/preactjs/wmr/commit/3fa2aebf4447c349e7a70eeed9736c2060236916) [#441](https://github.com/preactjs/wmr/pull/441) Thanks [@marvinhagemeister](https://github.com/marvinhagemeister)! - Add colored namespaces to debug output when `DEBUG=true` is set.

- [`2102ffb`](https://github.com/preactjs/wmr/commit/2102ffb4807e04c4858fc28ed5e1463e38ee3a1f) [#409](https://github.com/preactjs/wmr/pull/409) Thanks [@aduh95](https://github.com/aduh95)! - Fix double quotes imports with bundle-plugin

* [`4d36e2a`](https://github.com/preactjs/wmr/commit/4d36e2a42884784517a047930b955724cebac6ba) [#427](https://github.com/preactjs/wmr/pull/427) Thanks [@JoviDeCroock](https://github.com/JoviDeCroock)! - Fix case where the module-graph would become stale if two co-dependent modules would import the same file, when this file would get updated we'd only cache-bust the import in one of those two files making the graph stale. One file updates the old version and the other updates the new one.

- [`2405b8c`](https://github.com/preactjs/wmr/commit/2405b8c0569cdcf738122a79c451e1a3cff1b630) [#437](https://github.com/preactjs/wmr/pull/437) Thanks [@JoviDeCroock](https://github.com/JoviDeCroock)! - Support Typescript config files

* [`0737249`](https://github.com/preactjs/wmr/commit/0737249a5888e098c6fa65eb28e77f1ab966061a) [#465](https://github.com/preactjs/wmr/pull/465) Thanks [@marvinhagemeister](https://github.com/marvinhagemeister)! - Use same user plugin ordering in dev and production mode

- [`cecac5f`](https://github.com/preactjs/wmr/commit/cecac5f3b06d3613b26059515a691476d43fb2ff) [#482](https://github.com/preactjs/wmr/pull/482) Thanks [@marvinhagemeister](https://github.com/marvinhagemeister)! - Fix unable to load node builtins in config file

* [`5ae39be`](https://github.com/preactjs/wmr/commit/5ae39be2fe62e597abdea0d3ac1e3a212efc990b) [#453](https://github.com/preactjs/wmr/pull/453) Thanks [@marvinhagemeister](https://github.com/marvinhagemeister)! - Align astronaut emoji with addresses in startup message

- [`bcf3bdf`](https://github.com/preactjs/wmr/commit/bcf3bdf8f4556a621f6470c39c05e041e41d4f5a) [#433](https://github.com/preactjs/wmr/pull/433) Thanks [@JoviDeCroock](https://github.com/JoviDeCroock)! - Newly created files shouldn't cause a page-reload

* [`3419af9`](https://github.com/preactjs/wmr/commit/3419af91b31aebe61497869f8aacfe81c576b0d5) [#466](https://github.com/preactjs/wmr/pull/466) Thanks [@marvinhagemeister](https://github.com/marvinhagemeister)! - Add plugin `config()` and `configResolved()` tests

- [`baa85c7`](https://github.com/preactjs/wmr/commit/baa85c7acbd8706b64d07741040a5773b248d25a) [#450](https://github.com/preactjs/wmr/pull/450) Thanks [@marvinhagemeister](https://github.com/marvinhagemeister)! - This PR adds a redesigned startup screen to make it easier to read addresses at a glance.

* [`8320de5`](https://github.com/preactjs/wmr/commit/8320de54c84bd13bb2572c7e04390e8bba6ec77d) [#480](https://github.com/preactjs/wmr/pull/480) Thanks [@marvinhagemeister](https://github.com/marvinhagemeister)! - Fix unable to load json files during prerendering

- [`fc5cf31`](https://github.com/preactjs/wmr/commit/fc5cf31ea4815c88459c4718149215f37563c1a2) [#468](https://github.com/preactjs/wmr/pull/468) Thanks [@marvinhagemeister](https://github.com/marvinhagemeister)! - Fix incorrect plugin ordering introduced in #465 (unreleased)

* [`ef273aa`](https://github.com/preactjs/wmr/commit/ef273aa6744feb7c1b34b7dd6c2edf01a41770d7) [#486](https://github.com/preactjs/wmr/pull/486) Thanks [@marvinhagemeister](https://github.com/marvinhagemeister)! - Only show DEBUG messages when DEBUG=true or DEBUG=1

- [`2f36c6f`](https://github.com/preactjs/wmr/commit/2f36c6f7045268bd95fc41be16cba593ecf97326) [#463](https://github.com/preactjs/wmr/pull/463) Thanks [@marvinhagemeister](https://github.com/marvinhagemeister)! - Always throw if the user requested a specific port and it's not available

* [`edf9106`](https://github.com/preactjs/wmr/commit/edf9106a6e1767d288572e4967f749958c7b484c) [#442](https://github.com/preactjs/wmr/pull/442) Thanks [@marvinhagemeister](https://github.com/marvinhagemeister)! - Don't resolve config file twice during compilation

## 1.3.2

### Patch Changes

- [`7fc6570`](https://github.com/preactjs/wmr/commit/7fc6570134b6aa0c9da06ab16b95569a6563ee9f) [#393](https://github.com/preactjs/wmr/pull/393) Thanks [@JoviDeCroock](https://github.com/JoviDeCroock)! - remove search parameters from pre-rendered url's

* [`2f88ebf`](https://github.com/preactjs/wmr/commit/2f88ebf441a87fe82e6cd298693ade92fbf9595e) [#396](https://github.com/preactjs/wmr/pull/396) Thanks [@piotr-cz](https://github.com/piotr-cz)! - Fix source maps in styles-plugin

- [`42fa940`](https://github.com/preactjs/wmr/commit/42fa94027c0adc05b1e05b364010eb39203a12e8) [#385](https://github.com/preactjs/wmr/pull/385) Thanks [@JoviDeCroock](https://github.com/JoviDeCroock)! - Fix case where deduped css would crash the bundle

* [`8a5a475`](https://github.com/preactjs/wmr/commit/8a5a4750512037984a4f06c78545e45c845b6be2) [#397](https://github.com/preactjs/wmr/pull/397) Thanks [@piotr-cz](https://github.com/piotr-cz)! - Move sourcemap option from start to build command

- [`a32d855`](https://github.com/preactjs/wmr/commit/a32d855683358f806b0962d0b4ee40e7aa7df691) [#387](https://github.com/preactjs/wmr/pull/387) Thanks [@JoviDeCroock](https://github.com/JoviDeCroock)! - Convert Set to Array before calling .every for hmr

## 1.3.1

### Patch Changes

- [`c740ac0`](https://github.com/preactjs/wmr/commit/c740ac0cb611d4b2979a4b9413bd5abb901e776b) [#370](https://github.com/preactjs/wmr/pull/370) Thanks [@JoviDeCroock](https://github.com/JoviDeCroock)! - Fix non-js hmr

* [`c740ac0`](https://github.com/preactjs/wmr/commit/c740ac0cb611d4b2979a4b9413bd5abb901e776b) [#370](https://github.com/preactjs/wmr/pull/370) Thanks [@JoviDeCroock](https://github.com/JoviDeCroock)! - Fix support for scss/sass hmr

## 1.3.0

### Minor Changes

- [`ed47713`](https://github.com/preactjs/wmr/commit/ed47713ed059f6fcac95e2d49d1c93e0999296fb) [#262](https://github.com/preactjs/wmr/pull/262) Thanks [@JoviDeCroock](https://github.com/JoviDeCroock)! - Handle hmr on the development server, this enables bubbling in hmr signals that aren't accepted.

* [`a735d19`](https://github.com/preactjs/wmr/commit/a735d19e9d0d3c89e7a52345795e4767134f54ed) [#330](https://github.com/preactjs/wmr/pull/330) Thanks [@developit](https://github.com/developit)! - Add prerendering of <head>, support .html URLs

### Patch Changes

- [`cd2112c`](https://github.com/preactjs/wmr/commit/cd2112c5ea73f4c7ba151f22175bc35cfced15e7) [#347](https://github.com/preactjs/wmr/pull/347) Thanks [@JoviDeCroock](https://github.com/JoviDeCroock)! - Fix config loading on Windows

* [`bf6e97a`](https://github.com/preactjs/wmr/commit/bf6e97a5cf08876f08d3e11a123c53c8f34fdd20) [#344](https://github.com/preactjs/wmr/pull/344) Thanks [@JoviDeCroock](https://github.com/JoviDeCroock)! - Don't cache plugin files
