# wmr

## 3.8.0

### Minor Changes

- [`2d768a1`](https://github.com/preactjs/wmr/commit/2d768a13e7b42ff62430a0a573706f5620b842c6) [#875](https://github.com/preactjs/wmr/pull/875) Thanks [@JoviDeCroock](https://github.com/JoviDeCroock)! - Add a tsconfig-paths plugin that will check for a tsconfig and respect the paths option when present

* [`c0b0b1b`](https://github.com/preactjs/wmr/commit/c0b0b1b8df5ca6a650a7dc8f8edad73bf70de52d) [#934](https://github.com/preactjs/wmr/pull/934) Thanks [@takurinton](https://github.com/takurinton)! - Adds resource fetch shim for prererendering

- [`e546afc`](https://github.com/preactjs/wmr/commit/e546afc8f73a12131a974cdbc9b07381858f7146) [#935](https://github.com/preactjs/wmr/pull/935) Thanks [@takurinton](https://github.com/takurinton)! - Add fetching external resources using native fetch API when Node.js version 18 later

### Patch Changes

- [`31583c7`](https://github.com/preactjs/wmr/commit/31583c7d77f91fc9d69bb3bcc2919a6f80f7d3b4) [#904](https://github.com/preactjs/wmr/pull/904) Thanks [@rschristian](https://github.com/rschristian)! - Ensures config file has been merged before attempting to create output directory

* [`dfa4cbd`](https://github.com/preactjs/wmr/commit/dfa4cbd4dfbaf72587a741e08ad68bf978734148) [#917](https://github.com/preactjs/wmr/pull/917) Thanks [@rschristian](https://github.com/rschristian)! - Ensures TS config file is transpiled to ESM so that it can use `defineConfig`

- [`2465fbb`](https://github.com/preactjs/wmr/commit/2465fbba9e0888d2191d0fbcf613b26e81b4640e) [#895](https://github.com/preactjs/wmr/pull/895) Thanks [@rschristian](https://github.com/rschristian)! - Fix lack of hydration when not returning prerender data

* [`69b0496`](https://github.com/preactjs/wmr/commit/69b04968336ca3a3137a286381afe4dc8de2e03b) [#900](https://github.com/preactjs/wmr/pull/900) Thanks [@rschristian](https://github.com/rschristian)! - Ensures leading newline in text nodes is not converted to whitespace

- [`d5d8fff`](https://github.com/preactjs/wmr/commit/d5d8fffe44a8f82e65fa78a9f3cff1b93a236d7f) [#927](https://github.com/preactjs/wmr/pull/927) Thanks [@rschristian](https://github.com/rschristian)! - Checks to ensure a sourcemap has sourcesContent before attempting to consume it

* [`d9de528`](https://github.com/preactjs/wmr/commit/d9de52831831bacf3a0afc62f40eab521542c174) [#901](https://github.com/preactjs/wmr/pull/901) Thanks [@rschristian](https://github.com/rschristian)! - Disables (non-actionable) browserslist warning

- [`f75af7c`](https://github.com/preactjs/wmr/commit/f75af7cc52460548c077b1f8a56d778962856107) [#905](https://github.com/preactjs/wmr/pull/905) Thanks [@rschristian](https://github.com/rschristian)! - First script tag in HTML should be assumed to have prerender(), not last

* [`21ec4f4`](https://github.com/preactjs/wmr/commit/21ec4f4cf8cd159b3f2542773f381a99661a4e2f) [#913](https://github.com/preactjs/wmr/pull/913) Thanks [@cristianbote](https://github.com/cristianbote)! - When prerendering avoid replacing regex group token \$1 when is present in html contents

- [`b849238`](https://github.com/preactjs/wmr/commit/b8492382ea2d35aa028e36ed0207c7c4742b1bd3) [#924](https://github.com/preactjs/wmr/pull/924) Thanks [@rschristian](https://github.com/rschristian)! - Supports top-level await in dev

* [`b38a8f2`](https://github.com/preactjs/wmr/commit/b38a8f234eb03ee0b6ecbec916b0cf3080a64513) [#908](https://github.com/preactjs/wmr/pull/908) Thanks [@rschristian](https://github.com/rschristian)! - Corrects duplicated information in CLI help menu

## 3.7.2

### Patch Changes

- [`8771444`](https://github.com/preactjs/wmr/commit/8771444b21ae7261c6bad583cb9716bd3d7c9f3d) [#862](https://github.com/preactjs/wmr/pull/862) Thanks [@marvinhagemeister](https://github.com/marvinhagemeister)! - Don't flood terminal with harmless `The 'this' keyword is equivalent to 'undefined' at the top level of an ES module, and has been rewritten.` warnings.

* [`9fbafb1`](https://github.com/preactjs/wmr/commit/9fbafb12620435b35e2fa5b20b7dc8b9b623b34d) [#858](https://github.com/preactjs/wmr/pull/858) Thanks [@marvinhagemeister](https://github.com/marvinhagemeister)! - Fix compilation error when using `static` class fields

- [`6b36713`](https://github.com/preactjs/wmr/commit/6b36713ecf870b9572e24a6d1c1a3cefa65e591b) [#861](https://github.com/preactjs/wmr/pull/861) Thanks [@marvinhagemeister](https://github.com/marvinhagemeister)! - Resolve a wrongly replaced `process.env` variable when a binding with the name `process` is already in scope. This was encountered when bundling vscode's monaco-editor.

* [`1cfa4a1`](https://github.com/preactjs/wmr/commit/1cfa4a1bc93a1553f84e4da553354dd980ea2f4d) [#872](https://github.com/preactjs/wmr/pull/872) Thanks [@JoviDeCroock](https://github.com/JoviDeCroock)! - Normalize the cacheKey in wmr-midddleware so it always corresponds to the WRITE_CACHE map where we store in native-path format keys

## 3.7.1

### Patch Changes

- [`dddb03a`](https://github.com/preactjs/wmr/commit/dddb03a156b21ae3725ee3fea73a3bad7c217876) [#849](https://github.com/preactjs/wmr/pull/849) Thanks [@marvinhagemeister](https://github.com/marvinhagemeister)! - Fix `iife`-warning for workers with exports when creating a production build.

* [`1d9791f`](https://github.com/preactjs/wmr/commit/1d9791f75fd1c0142a985f6e0b276dc97d5fe5de) [#852](https://github.com/preactjs/wmr/pull/852) Thanks [@marvinhagemeister](https://github.com/marvinhagemeister)! - Add code frame to uncaught exceptions if possible

- [`d75a2da`](https://github.com/preactjs/wmr/commit/d75a2da70508cd125374d2c202336525770428c6) [#850](https://github.com/preactjs/wmr/pull/850) Thanks [@marvinhagemeister](https://github.com/marvinhagemeister)! - Fix error when `plugins` or `middleware` array contains falsy values in the parsed configuration. This typically happens due to conditionally setting items. All falsy values are now filtered out by default.

* [`69b4e1c`](https://github.com/preactjs/wmr/commit/69b4e1c1173b1bb98518647c4c412c88542148ea) [#856](https://github.com/preactjs/wmr/pull/856) Thanks [@marvinhagemeister](https://github.com/marvinhagemeister)! - Fix `debug: true` option from config file not being set

- [`504af20`](https://github.com/preactjs/wmr/commit/504af2072e1e04f8ad946f64a191a813ae28ea3f) [#851](https://github.com/preactjs/wmr/pull/851) Thanks [@marvinhagemeister](https://github.com/marvinhagemeister)! - Improve CLI output for compilation warnings

* [`8064c88`](https://github.com/preactjs/wmr/commit/8064c88b2d23d882ccf706410751c947cc33bf25) [#846](https://github.com/preactjs/wmr/pull/846) Thanks [@marvinhagemeister](https://github.com/marvinhagemeister)! - Fix missing `description` and `license` field in published wmr `package.json`

## 3.7.0

### Minor Changes

- [`585bcb2`](https://github.com/preactjs/wmr/commit/585bcb2dceb32da43a03c0345a142dbff400513f) [#842](https://github.com/preactjs/wmr/pull/842) Thanks [@marvinhagemeister](https://github.com/marvinhagemeister)! - Add `--minify` option to the `build` command. That way one can disable minifcation for production builds by passing `--no-minify` or `--minify false`

* [`27a41df`](https://github.com/preactjs/wmr/commit/27a41df4d44f68ab3bddf8d920437488ce5744ad) [#827](https://github.com/preactjs/wmr/pull/827) Thanks [@marvinhagemeister](https://github.com/marvinhagemeister)! - Add built-in support for [Web Workers](https://developer.mozilla.org/en-US/docs/Web/API/Web_Workers_API/Using_web_workers) based on browser APIs. Example on how to use Web Workers with WMR: https://wmr.dev/docs/web-workers

### Patch Changes

- [`71d02e0`](https://github.com/preactjs/wmr/commit/71d02e04ed5854dd646f477b974a3a6ff7bc0ce6) [#840](https://github.com/preactjs/wmr/pull/840) Thanks [@marvinhagemeister](https://github.com/marvinhagemeister)! - Fix `config()` and `configResolved()` plugin hooks being skipped when the previous plugin didn't have those hooks

* [`cd17272`](https://github.com/preactjs/wmr/commit/cd172727f99f09f7db40cf10b204769b6ca0dfea) [#844](https://github.com/preactjs/wmr/pull/844) Thanks [@marvinhagemeister](https://github.com/marvinhagemeister)! - Distinguish dev server from normal server ("serve" command) in cli output

- [`b072d94`](https://github.com/preactjs/wmr/commit/b072d9457bacc7932981311dca953db3cab8915a) [#843](https://github.com/preactjs/wmr/pull/843) Thanks [@marvinhagemeister](https://github.com/marvinhagemeister)! - Sort list of outputted files by size within a group

* [`221c8fe`](https://github.com/preactjs/wmr/commit/221c8fe8b77813cb4622c7d7e9601e5c20f1a3d3) [#828](https://github.com/preactjs/wmr/pull/828) Thanks [@marvinhagemeister](https://github.com/marvinhagemeister)! - Fix missing props when there were comments between attributes in JSX

## 3.6.1

### Patch Changes

- [`ab9ceee`](https://github.com/preactjs/wmr/commit/ab9ceeec53da3a86f33b5e29706037a998136c60) [#819](https://github.com/preactjs/wmr/pull/819) Thanks [@developit](https://github.com/developit)! - Fix complex `process.env` usage (ex: `let {A}=process.env`, but not `process.env.A`) generating invalid code.

* [`9c7be51`](https://github.com/preactjs/wmr/commit/9c7be51861d6778e8b33bee6b47679f5e2d5a62e) [#821](https://github.com/preactjs/wmr/pull/821) Thanks [@marvinhagemeister](https://github.com/marvinhagemeister)! - Fix missing `this.error()` method in Rollup plugins

- [`0c62f25`](https://github.com/preactjs/wmr/commit/0c62f258d5bc5776bcbe89ae7506f0d8ef1925d0) [#822](https://github.com/preactjs/wmr/pull/822) Thanks [@marvinhagemeister](https://github.com/marvinhagemeister)! - Fix crash when calling `emitFile` for chunks without a name

* [`416451c`](https://github.com/preactjs/wmr/commit/416451cc7ea3e916223ab138778d12a81182bf5b) [#816](https://github.com/preactjs/wmr/pull/816) Thanks [@marvinhagemeister](https://github.com/marvinhagemeister)! - Print file which triggered warning when the `composes` keyword is attempted to be used outside of a CSS-Module file

- [`778ee03`](https://github.com/preactjs/wmr/commit/778ee0392ca25cbfea044ed6f3cf2db62dacfdc1) [#823](https://github.com/preactjs/wmr/pull/823) Thanks [@marvinhagemeister](https://github.com/marvinhagemeister)! - Fix incorrectly transformed dynamic import statements when there was a comment in front of the specifier (`import(/* foo */ 'my-module')`)

* [`980b3d9`](https://github.com/preactjs/wmr/commit/980b3d9c3092882f5e27b955b66144d46fbd15b6) [#820](https://github.com/preactjs/wmr/pull/820) Thanks [@marvinhagemeister](https://github.com/marvinhagemeister)! - Add support for Rollup `outputOptions` hook

- [`abafe8c`](https://github.com/preactjs/wmr/commit/abafe8cf7c7c99b81040caf0b3d324f62e171b79) [#810](https://github.com/preactjs/wmr/pull/810) Thanks [@marvinhagemeister](https://github.com/marvinhagemeister)! - Fix unable to load json files from outside project public directory.

* [`cbc98be`](https://github.com/preactjs/wmr/commit/cbc98beb4861a4f93ffe7f2417f885b5689b8268) [#815](https://github.com/preactjs/wmr/pull/815) Thanks [@marvinhagemeister](https://github.com/marvinhagemeister)! - Fix nested relative `.less` file resolved as npm package in production

## 3.6.0

### Minor Changes

- [`a49e4f9`](https://github.com/preactjs/wmr/commit/a49e4f9d56e7acec95cf3b02a4aba4e19b6083b0) [#806](https://github.com/preactjs/wmr/pull/806) Thanks [@marvinhagemeister](https://github.com/marvinhagemeister)! - Add support for `.less` stylesheets.

### Patch Changes

- [`f03859b`](https://github.com/preactjs/wmr/commit/f03859b5eb46a052a78c22d2d5a3883fe86e80a8) [#812](https://github.com/preactjs/wmr/pull/812) Thanks [@marvinhagemeister](https://github.com/marvinhagemeister)! - Add a workaround to support virtual identifiers starting with `/@` to support `rollup-plugin-windicss`.

* [`81b0e5e`](https://github.com/preactjs/wmr/commit/81b0e5e13556b322ceb049e88f11876224172e82) [#611](https://github.com/preactjs/wmr/pull/611) Thanks [@rschristian](https://github.com/rschristian)! - Updates the bundle visualizer to latest, allowing for some useful output exclusions

- [`4e37369`](https://github.com/preactjs/wmr/commit/4e37369544b639a45f64ad0c0713d68b1a0a3c55) [#802](https://github.com/preactjs/wmr/pull/802) Thanks [@rschristian](https://github.com/rschristian)! - If Preact-CLI's debug service worker is detected, WMR will unregister it to avoid repeated 404 errors.

* [`be5cda0`](https://github.com/preactjs/wmr/commit/be5cda088a31530d1ab627bec07b362c5f515ecb) [#807](https://github.com/preactjs/wmr/pull/807) Thanks [@lPadier](https://github.com/lPadier)! - Fix building JSX nodes with object with more than 5 properties and then JSX in ap

- [`e8d22ae`](https://github.com/preactjs/wmr/commit/e8d22ae2162255b1f14441f0a9f9ed940b166669) [#805](https://github.com/preactjs/wmr/pull/805) Thanks [@marvinhagemeister](https://github.com/marvinhagemeister)! - Fix `.scss` files not being renamed to `.css` on production builds, when they were directly referenced in an HTML file.

* [`e49e856`](https://github.com/preactjs/wmr/commit/e49e8566b6ede97ac899fc5b7fbba9f8a4f1a957) [#814](https://github.com/preactjs/wmr/pull/814) Thanks [@marvinhagemeister](https://github.com/marvinhagemeister)! - Add missing watch events to rollup's `watchChange` hook in development

## 3.5.1

### Patch Changes

- [`e1c1db2`](https://github.com/preactjs/wmr/commit/e1c1db2cfd1edf86d3378eca8a43c98f37394a02) [#797](https://github.com/preactjs/wmr/pull/797) Thanks [@developit](https://github.com/developit)! - Fix HMR breaking in Web Workers

## 3.5.0

### Minor Changes

- [`1367d57`](https://github.com/preactjs/wmr/commit/1367d576137a4e0b9a80c80dc044531b87149a20) [#790](https://github.com/preactjs/wmr/pull/790) Thanks [@marvinhagemeister](https://github.com/marvinhagemeister)! - Serve exactly matched files in root (default: `/public`) as is instead of serving the fallback `index.html`. This effectively turns the root directory in an asset directory.

### Patch Changes

- [`731fb56`](https://github.com/preactjs/wmr/commit/731fb565130f926b0868764bb7d22e2bee642c5a) [#782](https://github.com/preactjs/wmr/pull/782) Thanks [@JoviDeCroock](https://github.com/JoviDeCroock)! - Transpile scss when it's included from an html file

* [`fd94818`](https://github.com/preactjs/wmr/commit/fd948183c78488379b4412595b176befa28a49ba) [#778](https://github.com/preactjs/wmr/pull/778) Thanks [@developit](https://github.com/developit)! - Avoid isIdentifier() crash on null/undefined values

- [`e6c6d1c`](https://github.com/preactjs/wmr/commit/e6c6d1cbe297a1e7be4987265de6538b0281391f) [#789](https://github.com/preactjs/wmr/pull/789) Thanks [@JoviDeCroock](https://github.com/JoviDeCroock)! - Correctly import nested sass-imports from html files and avoid duplicate asset-copy

* [`50c7128`](https://github.com/preactjs/wmr/commit/50c7128d6c367a0d5d2de2a164b57ce07c0c53cb) [#774](https://github.com/preactjs/wmr/pull/774) Thanks [@marvinhagemeister](https://github.com/marvinhagemeister)! - Fix absolute imports starting with `/` not working in SASS

## 3.4.1

### Patch Changes

- [`9025ca1`](https://github.com/preactjs/wmr/commit/9025ca1212e5cd241834524310f89e0db94aadc1) [#762](https://github.com/preactjs/wmr/pull/762) Thanks [@marvinhagemeister](https://github.com/marvinhagemeister)! - Fix unable to intercept WMR middlewares. Custom middlewares are now the first to be processed, similar to plugins.

* [`78fb36d`](https://github.com/preactjs/wmr/commit/78fb36d3fef1c30ceee9f0b9b3ecabb29c8bb525) [#760](https://github.com/preactjs/wmr/pull/760) Thanks [@marvinhagemeister](https://github.com/marvinhagemeister)! - Fix incorrect middleware `request` typings

- [`9aeee5c`](https://github.com/preactjs/wmr/commit/9aeee5ce6ab3e8f2e55f0a72907e6b95f16fedae) [#770](https://github.com/preactjs/wmr/pull/770) Thanks [@marvinhagemeister](https://github.com/marvinhagemeister)! - Fix ImportSpecifier wrongly detected as import assert keyword when it starts with `assert*`

## 3.4.0

### Minor Changes

- [`e83e271`](https://github.com/preactjs/wmr/commit/e83e2717f4beb9677f7716f4222af87ca26cb14f) [#758](https://github.com/preactjs/wmr/pull/758) Thanks [@marvinhagemeister](https://github.com/marvinhagemeister)! - TypeScript: Add support for the `override` keyword on class methods

### Patch Changes

- [`6313cd8`](https://github.com/preactjs/wmr/commit/6313cd8e333771ba0c9d391271559dc1f3b0acb9) [#752](https://github.com/preactjs/wmr/pull/752) Thanks [@developit](https://github.com/developit)! - Improve error message when `prerender()` is not exported

* [`884f44f`](https://github.com/preactjs/wmr/commit/884f44f2f8f8a07037282e57e33a906585fe0a64) [#759](https://github.com/preactjs/wmr/pull/759) Thanks [@developit](https://github.com/developit)! - Fix serialization of namespaced JSX props (`<x:y a:b="c" />`).

- [`2162a21`](https://github.com/preactjs/wmr/commit/2162a218b77145d44248b27c4b19157271649066) [#751](https://github.com/preactjs/wmr/pull/751) Thanks [@developit](https://github.com/developit)! - Preserve Data URLs in script tags instead of attempting to bundle them for production.

* [`71f317c`](https://github.com/preactjs/wmr/commit/71f317cca4df29b1b0bd52f71e76d76b0b308a05) [#757](https://github.com/preactjs/wmr/pull/757) Thanks [@marvinhagemeister](https://github.com/marvinhagemeister)! - Fix "No sass compiler found" error not shown to the user in the terminal when no sass compiler could be found

## 3.3.1

### Patch Changes

- [`d94937f`](https://github.com/preactjs/wmr/commit/d94937fee0804657006382711c3b2e169fdff98a) [#728](https://github.com/preactjs/wmr/pull/728) Thanks [@marvinhagemeister](https://github.com/marvinhagemeister)! - Fix `Cannot read property 'edit' of null` error. This was caused by a wrong alternative to substring matches of `String.prototype.replace`.

## 3.3.0

### Minor Changes

- [`b69f35a`](https://github.com/preactjs/wmr/commit/b69f35a7a394edb923fe26dae0d72e36d5f2eb5d) [#724](https://github.com/preactjs/wmr/pull/724) Thanks [@marvinhagemeister](https://github.com/marvinhagemeister)! - Allow plugins to intercept any file that's imported in JavaScript, not just script and stylesheet files.

### Patch Changes

- [`e963a56`](https://github.com/preactjs/wmr/commit/e963a560b46f0cb210878696b2c4c7cf6f2375aa) [#715](https://github.com/preactjs/wmr/pull/715) Thanks [@marvinhagemeister](https://github.com/marvinhagemeister)! - Rewrite internal source map handling. This adds full support for source maps during `development` and `production` and ensures that `.map` files are served correctly.

## 3.2.0

### Minor Changes

- [`8aff0a1`](https://github.com/preactjs/wmr/commit/8aff0a157fe25597701809aa4cadcf37dd336a46) [#712](https://github.com/preactjs/wmr/pull/712) Thanks [@marvinhagemeister](https://github.com/marvinhagemeister)! - Add support for logical assignment operators.

  ```js
  // "Or Or Equals" (or, the Mallet operator :wink:)
  a ||= b;
  a || (a = b);

  // "And And Equals"
  a &&= b;
  a && (a = b);

  // "QQ Equals"
  a ??= b;
  a ?? (a = b);
  ```

* [`71ef3aa`](https://github.com/preactjs/wmr/commit/71ef3aae680230d39f7391e576659ce2af576518) [#710](https://github.com/preactjs/wmr/pull/710) Thanks [@marvinhagemeister](https://github.com/marvinhagemeister)! - Add support for private class fields which is a recent addition to JavaScript (currently Stage 3). We're adding it because it's supported in all major browsers natively.

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

- [`d49c674`](https://github.com/preactjs/wmr/commit/d49c67464dfc5fccd3f6df6b6bcb98806e744009) [#717](https://github.com/preactjs/wmr/pull/717) Thanks [@rschristian](https://github.com/rschristian)! - Adds new config option for specifying additional links to prerender in your WMR configuration file.

  ```js
  // wmr config
  import { defineConfig } from 'wmr';

  export default defineConfig({
  	customRoutes: ['/foo/bar', '/my-other-route', '/rss.xml']
  });
  ```

### Patch Changes

- [`21b467e`](https://github.com/preactjs/wmr/commit/21b467e8be17ca044dbf92009e603bf9256bf7df) [#719](https://github.com/preactjs/wmr/pull/719) Thanks [@marvinhagemeister](https://github.com/marvinhagemeister)! - Fix HMR updates not bubbled through proxy modules. This resolves an issue where the page was not updated when a new CSS class was added to a CSS-Module or Sass-Module.

* [`34ce488`](https://github.com/preactjs/wmr/commit/34ce488a05e5530e05879a928568320f18d76b57) [#713](https://github.com/preactjs/wmr/pull/713) Thanks [@marvinhagemeister](https://github.com/marvinhagemeister)! - Fix missing version on `--version` argument

## 3.1.1

### Patch Changes

- [`01fca1c`](https://github.com/preactjs/wmr/commit/01fca1cbe058b8b93f24293d8d51b30926db1455) [#704](https://github.com/preactjs/wmr/pull/704) Thanks [@marvinhagemeister](https://github.com/marvinhagemeister)! - Sass: Fix HMR not working on windows due to `node-sass` returning unix-style paths

* [`ae087f7`](https://github.com/preactjs/wmr/commit/ae087f773d6c43305e9353b8adc6eb902f1c5a96) [#706](https://github.com/preactjs/wmr/pull/706) Thanks [@marvinhagemeister](https://github.com/marvinhagemeister)! - Sass: Fix relative import specifiers in the form of `./foo.scss` being resolved against the wrong directory

## 3.1.0

### Minor Changes

- [`22f3ac9`](https://github.com/preactjs/wmr/commit/22f3ac90c8ded4be03a1ae131389d275e12cc1d8) [#630](https://github.com/preactjs/wmr/pull/630) Thanks [@marvinhagemeister](https://github.com/marvinhagemeister)! - Add support for [import assertions](https://github.com/tc39/proposal-import-assertions) syntax that is very likely to come in an upcoming version of JavaScript. Import Assertions are a native way to load non-js files in ESM environments.

  ```js
  import foo from './foo.json' assert { type: 'json' };
  ```

  At the time of this writing this is only supported in Chrome, so we'll downtranspile import assertions to leverage loaders. This allows the code to run all browsers WMR supports.

### Patch Changes

- [`f12ffe3`](https://github.com/preactjs/wmr/commit/f12ffe348551850985e20463422bb2dadfbcf8de) [#701](https://github.com/preactjs/wmr/pull/701) Thanks [@marvinhagemeister](https://github.com/marvinhagemeister)! - Fix sass crashing when an imported file is not found

## 3.0.2

### Patch Changes

- [`94c9a58`](https://github.com/preactjs/wmr/commit/94c9a5869d624188293829dc370c45a1bf6d3253) [#696](https://github.com/preactjs/wmr/pull/696) Thanks [@marvinhagemeister](https://github.com/marvinhagemeister)! - Fix missing terminal colors in CI environments

* [`5ba6edc`](https://github.com/preactjs/wmr/commit/5ba6edc232f28aaf788a50b43cf8cf7d62a4a6e5) [#698](https://github.com/preactjs/wmr/pull/698) Thanks [@marvinhagemeister](https://github.com/marvinhagemeister)! - Fix crash on Windows due to invalid cache file paths

## 3.0.1

### Patch Changes

- [`b134646`](https://github.com/preactjs/wmr/commit/b1346460da8485f0767911bbb3a88e9731bd8cfb) [#694](https://github.com/preactjs/wmr/pull/694) Thanks [@marvinhagemeister](https://github.com/marvinhagemeister)! - Fix potential issue during development, where different CSS assets would share the same URL

## 3.0.0

### Major Changes

- [`22150b3`](https://github.com/preactjs/wmr/commit/22150b3d1e35ba272930e9506744d6bcc0a40500) [#680](https://github.com/preactjs/wmr/pull/680) Thanks [@marvinhagemeister](https://github.com/marvinhagemeister)! - Fix swapped usage of `cwd` vs `root`. Now, `cwd` always refers to the current working directory and `root` the web root to serve from (= usually cwd+/public).

  This change was done to reduce the amount of extra knowledge to be aware of when using WMR. It was a frequent source of confusion.

  #### Migration guide:

  If you used `options.cwd` or `options.root` in one of your plugins you need to swap them.

* [`0f91e7f`](https://github.com/preactjs/wmr/commit/0f91e7f879f503e857100259202d5aedfa3db150) [#684](https://github.com/preactjs/wmr/pull/684) Thanks [@marvinhagemeister](https://github.com/marvinhagemeister)! - Completely rewrite our stylesheet pipeline. All CSS files can now be intercepted from plugins allowing us to leverage the same pipeline that we use for production during development.

  - Fixes `.scss/.sass` not compiled on watch
  - Fixes nested `.scss/.sass` files not compiled with sass
  - Fixes `.scss/.sass` files not compiled when directly referenced in HTML
  - Fixes asset caching overwriting each others entries
  - Adds groundwork for intercepting urls inside css for aliasing or resolving from `node_modules`

### Minor Changes

- [`97c3ab5`](https://github.com/preactjs/wmr/commit/97c3ab557c053472bf7c81446db0c81a8da3473b) [#685](https://github.com/preactjs/wmr/pull/685) Thanks [@marvinhagemeister](https://github.com/marvinhagemeister)! - Sass: Include imported urls and file path into plugin resolution. This allows sass to load aliased files for example.

### Patch Changes

- [`8c3993f`](https://github.com/preactjs/wmr/commit/8c3993f85f5ae3cf48bf8d5336e1cc01bc9a1d68) [#676](https://github.com/preactjs/wmr/pull/676) Thanks [@marvinhagemeister](https://github.com/marvinhagemeister)! - Ensure that built-in plugins only work on files they can handle

* [`cdf5179`](https://github.com/preactjs/wmr/commit/cdf5179af941551b6c2da0d910cf9ba2afd91e96) [#690](https://github.com/preactjs/wmr/pull/690) Thanks [@marvinhagemeister](https://github.com/marvinhagemeister)! - Fix nested CSS HMR not working

- [`ea6606f`](https://github.com/preactjs/wmr/commit/ea6606fa14f1f0c0b5ab9f0f070333046371e87e) [#691](https://github.com/preactjs/wmr/pull/691) Thanks [@marvinhagemeister](https://github.com/marvinhagemeister)! - Fix CLI environment variables overwritten by `.env` files

## 2.2.2

### Patch Changes

- [`8c05814`](https://github.com/preactjs/wmr/commit/8c0581495f2713c98a134bc168139a8562237d96) [#658](https://github.com/preactjs/wmr/pull/658) Thanks [@rschristian](https://github.com/rschristian)! - Removes debug log

## 2.2.1

### Patch Changes

- [`95da598`](https://github.com/preactjs/wmr/commit/95da598ecdd8f8e673b12993b174877cf0b4e727) [#643](https://github.com/preactjs/wmr/pull/643) Thanks [@developit](https://github.com/developit)! - Never copy `wmr.config.js` to output directory

* [`6a9869f`](https://github.com/preactjs/wmr/commit/6a9869f66e3444af419697e91b24a610435f3729) [#656](https://github.com/preactjs/wmr/pull/656) Thanks [@marvinhagemeister](https://github.com/marvinhagemeister)! - Fix unable to code generate JSXMemberExpression and JSXEmptyExpression nodes

- [`7345e89`](https://github.com/preactjs/wmr/commit/7345e893e21c318738549e7d1c5fe92b30321afe) [#648](https://github.com/preactjs/wmr/pull/648) Thanks [@lukeed](https://github.com/lukeed)! - fix(compression): ensure all responses write headers

* [`df93873`](https://github.com/preactjs/wmr/commit/df93873b6c2036bdc120f47e22a69dbe139c0341) [#635](https://github.com/preactjs/wmr/pull/635) Thanks [@marvinhagemeister](https://github.com/marvinhagemeister)! - Fix `./` not preserved during development for `resolveId()` plugin hook

- [`c03abcc`](https://github.com/preactjs/wmr/commit/c03abcc36c26dc936af8701ab9031ddff44995a5) [#650](https://github.com/preactjs/wmr/pull/650) Thanks [@marvinhagemeister](https://github.com/marvinhagemeister)! - Prioritize extension resolution for extensionless imports.

* [`ccdc04d`](https://github.com/preactjs/wmr/commit/ccdc04d81272c764172453417c4291675459af62) [#641](https://github.com/preactjs/wmr/pull/641) Thanks [@developit](https://github.com/developit)! - Print warning when CSS Module mappings contain invalid identifiers

- [`fe4b9cb`](https://github.com/preactjs/wmr/commit/fe4b9cbea62f88de74bb59472b349d2e4969a212) [#649](https://github.com/preactjs/wmr/pull/649) Thanks [@leader22](https://github.com/leader22)! - Do not inject `<link rel=stylesheet>` when there is no stylesheet.

## 2.2.0

### Minor Changes

- [`9d5b381`](https://github.com/preactjs/wmr/commit/9d5b381aa2b161e82eb6bec1fc115a4fcc37c013) [#627](https://github.com/preactjs/wmr/pull/627) Thanks [@marvinhagemeister](https://github.com/marvinhagemeister)! - Add support for loading environment variables starting with `WMR_` by default.

### Patch Changes

- [`c177752`](https://github.com/preactjs/wmr/commit/c1777522cbc677b2712e89d9d646690e07e1e19e) [#634](https://github.com/preactjs/wmr/pull/634) Thanks [@marvinhagemeister](https://github.com/marvinhagemeister)! - Fix stray js config file when compiled with TypeScript

* [`cf6e5ce`](https://github.com/preactjs/wmr/commit/cf6e5ce5edfcac0427ddeb8d3949b79eecc356d7) [#633](https://github.com/preactjs/wmr/pull/633) Thanks [@cristianbote](https://github.com/cristianbote)! - Adapt the newline regex rule to match any character range so unicode or other forms of chars chan be matched.

- [`352a5ef`](https://github.com/preactjs/wmr/commit/352a5ef6ac27ee8203f7f294b3b4e3a5b3b15ffc) [#636](https://github.com/preactjs/wmr/pull/636) Thanks [@rschristian](https://github.com/rschristian)! - Fixes the debug flag/messages for optimize-graph-plugin

* [`6d525e4`](https://github.com/preactjs/wmr/commit/6d525e4b3b5e558a8839fd3fe0076494422bdad4) [#631](https://github.com/preactjs/wmr/pull/631) Thanks [@marvinhagemeister](https://github.com/marvinhagemeister)! - Fix unable to start when multiple config files in different formats are present.

- [`f1d41fe`](https://github.com/preactjs/wmr/commit/f1d41fe68c364a0201361e91289fd8f65665e540) [#625](https://github.com/preactjs/wmr/pull/625) Thanks [@rschristian](https://github.com/rschristian)! - Ensures TS wmr.config files are handled first

* [`93c93e9`](https://github.com/preactjs/wmr/commit/93c93e9b01eb7ebab2d7b4553a3f658e91872a3e) [#623](https://github.com/preactjs/wmr/pull/623) Thanks [@rschristian](https://github.com/rschristian)! - WMR now transpiles wmr.config.ts to the correct module type for the app

- [`f9fcfe0`](https://github.com/preactjs/wmr/commit/f9fcfe0b725a5fddca2e5162eb408db01852768c) [#628](https://github.com/preactjs/wmr/pull/628) Thanks [@marvinhagemeister](https://github.com/marvinhagemeister)! - Ensure options.cwd is correct after plugin passes

* [`8bbf3d0`](https://github.com/preactjs/wmr/commit/8bbf3d01722c17dda2d239b6b4e9f300a37f7122) [#624](https://github.com/preactjs/wmr/pull/624) Thanks [@rschristian](https://github.com/rschristian)! - Fixes bad id reassignment in case of wmr.config.ts

## 2.1.0

### Minor Changes

- [`10df8bb`](https://github.com/preactjs/wmr/commit/10df8bb7a3266f537f3e5742d2d8e85faa7962ac) [#619](https://github.com/preactjs/wmr/pull/619) Thanks [@marvinhagemeister](https://github.com/marvinhagemeister)! - Deprecate "aliases" configuration in favor of "alias" to have a consistent name across various frontend tools. The "aliases" property will continue to work, but a deprecation warning will be printed to the console.

  ```diff
  export default {
  -	aliases: {
  +	alias: {
  		react: 'preact/compat'
  	}
  };
  ```

* [`d907131`](https://github.com/preactjs/wmr/commit/d907131b43898e65872e3c4190456bc89b4fe58d) [#552](https://github.com/preactjs/wmr/pull/552) Thanks [@marvinhagemeister](https://github.com/marvinhagemeister)! - Add support for importing files outside of the main public directory. This feature is based on aliases and `<project>/src` is added by default. To prevent unexpected file access only the directories defined in the aliases and the public directory are allowed to read files from. To alias a new path add the following to your WMR configuration file:

  ```js
  // File: wmr.config.mjs
  import { defineConfig } from 'wmr';

  export default defineConfig({
  	alias: {
  		// This will alias "~" to "<project>/src/components/"
  		'~/': './src/components/'
  	}
  });
  ```

### Patch Changes

- [`7e3c2a7`](https://github.com/preactjs/wmr/commit/7e3c2a743071d7a2f93a4a48e65f612758eedd5c) [#622](https://github.com/preactjs/wmr/pull/622) Thanks [@marvinhagemeister](https://github.com/marvinhagemeister)! - Fix missing whitespace when JSXText spans multiple lines in prod

* [`36b927f`](https://github.com/preactjs/wmr/commit/36b927f7900543cdd6602cde00f307cb91f7cd57) [#612](https://github.com/preactjs/wmr/pull/612) Thanks [@developit](https://github.com/developit)! - Upgrade to Terser 5

- [`33a0fd7`](https://github.com/preactjs/wmr/commit/33a0fd7827d1197d9d32946360e73c6fd7fcf28d) [#620](https://github.com/preactjs/wmr/pull/620) Thanks [@marvinhagemeister](https://github.com/marvinhagemeister)! - Don't add default `src/*` path mapping if we're using it as our public directory already.

## 2.0.2

### Patch Changes

- [`a0024d5`](https://github.com/preactjs/wmr/commit/a0024d5297f8ec126ebad038fd5b9beccf74a5ba) [#607](https://github.com/preactjs/wmr/pull/607) Thanks [@marvinhagemeister](https://github.com/marvinhagemeister)! - Fix flash of unstyled content (=FLOUT) by hoisting entry js CSS files into the HTML via a `<link>`-tag

* [`08d66e3`](https://github.com/preactjs/wmr/commit/08d66e3799644a626af48208098bfa96959d7409) [#604](https://github.com/preactjs/wmr/pull/604) Thanks [@rschristian](https://github.com/rschristian)! - Ensuring .d.ts files aren't copied to build output

- [`ba40f5c`](https://github.com/preactjs/wmr/commit/ba40f5c6c2056867dbbc3eb3def5102103a031b5) [#610](https://github.com/preactjs/wmr/pull/610) Thanks [@rschristian](https://github.com/rschristian)! - Fixes some of WMR's CLI flags labelled as global when they're not

## 2.0.1

### Patch Changes

- [`0a9cbe8`](https://github.com/preactjs/wmr/commit/0a9cbe808f38aab10f15fb8f3e51cde8b3e37e37) [#596](https://github.com/preactjs/wmr/pull/596) Thanks [@rschristian](https://github.com/rschristian)! - WMR was published missing `"type": "module"` which immediately broke new projects due to the `wmr.config.mjs`

## 2.0.0

### Major Changes

- [`7561dc7`](https://github.com/preactjs/wmr/commit/7561dc7b5f3e2604ef0bf51ec4b337633bfc70d7) [#576](https://github.com/preactjs/wmr/pull/576) Thanks [@marvinhagemeister](https://github.com/marvinhagemeister)! - Rework prerendering API for tags in `document.head`. Previously the API is based on a subset of the actual `document.head` object. But in supplying a `document` global we rendered third party library checks invalid which usually use a variant of `typeof document === "undefined"` to determine if they're in a server environment or not. Since every library uses a different subset of the DOM API, it's impossible to support everyone. Instead using the server code paths of those libraries is a much more reliable approach.

  Any tags that should land in `document.head` can be added to the return value of the `prerender` function:

  ```js
  export async function prerender(data) {
  	// ...do your prerendering here

  	return {
  		// The string that is put inside <body>
  		html: '<h1>Hello world</h1>',
  		head: {
  			// sets document.title
  			title: 'My Cool Title',
  			// Sets the lang attribute on the <html> element
  			lang: 'en',
  			// Any element you want to put into document.head
  			elements: [
  				{ type: 'link', props: { rel: 'stylesheet', href: '/path/to/my/style.css' } },
  				{ type: 'meta', props: { property: 'og:title', content: 'Become an SEO Expert' } }
  			]
  		}
  	};
  }
  ```

### Minor Changes

- [`c10f534`](https://github.com/preactjs/wmr/commit/c10f534880ce652166c1513af18261ceb591f971) [#585](https://github.com/preactjs/wmr/pull/585) Thanks [@JoviDeCroock](https://github.com/JoviDeCroock)! - Support injecting prerender data by returning a `data` key from the prerender function

* [`bb77f83`](https://github.com/preactjs/wmr/commit/bb77f838404e69cfa4bf442761e7ae701908a41f) [#574](https://github.com/preactjs/wmr/pull/574) Thanks [@marvinhagemeister](https://github.com/marvinhagemeister)! - Add --debug flag as an alternative to DEBUG=true. It's easier on windows to pass a flag than to set an environment variable

- [`6e3bac1`](https://github.com/preactjs/wmr/commit/6e3bac1c0c2c696847275bcff7649edffc8d3ad0) [#529](https://github.com/preactjs/wmr/pull/529) Thanks [@marvinhagemeister](https://github.com/marvinhagemeister)! - Add defineConfig helper for better intellisense in config files

### Patch Changes

- [`ba2e29f`](https://github.com/preactjs/wmr/commit/ba2e29f2d5b3fb1a91301c1bff4f2dfba37fb335) [#575](https://github.com/preactjs/wmr/pull/575) Thanks [@marvinhagemeister](https://github.com/marvinhagemeister)! - Don't attempt to prerender external script urls

* [`79496a3`](https://github.com/preactjs/wmr/commit/79496a30be7245bf3429a07cd9ffa8c151e0fdde) [#590](https://github.com/preactjs/wmr/pull/590) Thanks [@marvinhagemeister](https://github.com/marvinhagemeister)! - Fix deeply nested CSS class not being hashed

- [`480d3b5`](https://github.com/preactjs/wmr/commit/480d3b5f4f407dff415d8fa6ba6d28ec5e495e1e) [#578](https://github.com/preactjs/wmr/pull/578) Thanks [@rschristian](https://github.com/rschristian)! - Instead of deleting the build output folder, it is instead emptied, allowing references to it to remain intact.

* [`01c4501`](https://github.com/preactjs/wmr/commit/01c4501a000fd256453d3d3b32a78d760fd2f2e7) [#569](https://github.com/preactjs/wmr/pull/569) Thanks [@marvinhagemeister](https://github.com/marvinhagemeister)! - Allow plugins to pick any specifier for virtual modules

## 1.7.0

### Minor Changes

- [`f892650`](https://github.com/preactjs/wmr/commit/f892650a084a95cfa21a23969d04fd63f374a7b7) [#549](https://github.com/preactjs/wmr/pull/549) Thanks [@marvinhagemeister](https://github.com/marvinhagemeister)! - Render an error overlay into the page on build errors

* [`f504d22`](https://github.com/preactjs/wmr/commit/f504d22019fcb3914efd3223f22983710c8cc288) [#562](https://github.com/preactjs/wmr/pull/562) Thanks [@marvinhagemeister](https://github.com/marvinhagemeister)! - Add support for loading environment variables from `import.meta.env`

### Patch Changes

- [`d2cad4e`](https://github.com/preactjs/wmr/commit/d2cad4e0f5d1330e0cb0e9ae4b8a530080e483a8) [#565](https://github.com/preactjs/wmr/pull/565) Thanks [@marvinhagemeister](https://github.com/marvinhagemeister)! - Fix missing build errors in terminal

* [`d3c29ef`](https://github.com/preactjs/wmr/commit/d3c29efb15b20a642278e2582225eefe97bbc3ab) [#560](https://github.com/preactjs/wmr/pull/560) Thanks [@ForsakenHarmony](https://github.com/ForsakenHarmony)! - fix: don't forward to next after responding

- [`51bea9c`](https://github.com/preactjs/wmr/commit/51bea9ce97d8de5ad81060736561f5ce6bcfe55b) [#561](https://github.com/preactjs/wmr/pull/561) Thanks [@ForsakenHarmony](https://github.com/ForsakenHarmony)! - chore: make cli easier to read and add uncaught exception handler

* [`3c4c993`](https://github.com/preactjs/wmr/commit/3c4c993789ca060eab7ccf46a04f243d2e609f18) [#566](https://github.com/preactjs/wmr/pull/566) Thanks [@marvinhagemeister](https://github.com/marvinhagemeister)! - Fix partially indented code frame on html warnings

- [`18b8f00`](https://github.com/preactjs/wmr/commit/18b8f00923ddf578f2f747c35bd24a8039eee3ba) [#570](https://github.com/preactjs/wmr/pull/570) Thanks [@marvinhagemeister](https://github.com/marvinhagemeister)! - Fix assets referenced in CSS not copied to outdir

* [`e6ecd14`](https://github.com/preactjs/wmr/commit/e6ecd1447dfa136ea303bfe2068d5c894c32a7c6) [#573](https://github.com/preactjs/wmr/pull/573) Thanks [@marvinhagemeister](https://github.com/marvinhagemeister)! - Throw an error when an entry file referenced in a script tag inside the HTML cannot be found

- [`2ce4d36`](https://github.com/preactjs/wmr/commit/2ce4d366921f7e73b595b3de2243c274ad1a0fed) [#558](https://github.com/preactjs/wmr/pull/558) Thanks [@marvinhagemeister](https://github.com/marvinhagemeister)! - Fix stale file content for entry files in watch mode

* [`41010c3`](https://github.com/preactjs/wmr/commit/41010c3b97648e88794a03e64f43720213186718) [#572](https://github.com/preactjs/wmr/pull/572) Thanks [@marvinhagemeister](https://github.com/marvinhagemeister)! - Fix missing generated files on cli output on build

- [`152be6c`](https://github.com/preactjs/wmr/commit/152be6c682462aaf3f3c29deb269d38efd95d95d) [#568](https://github.com/preactjs/wmr/pull/568) Thanks [@developit](https://github.com/developit)! - Prevent `wmr build` from checking port availability

## 1.6.0

### Minor Changes

- [`81771f5`](https://github.com/preactjs/wmr/commit/81771f5c3e8a2bfefe8c432f4a73070b4bcefb2e) [#543](https://github.com/preactjs/wmr/pull/543) Thanks [@Inviz](https://github.com/Inviz)! - Fixes an issue that caused scss/sass modules to not be properly updated when new classes were added to the file.

### Patch Changes

- [`d10d08c`](https://github.com/preactjs/wmr/commit/d10d08cc3b30e6a3baf588665275ea3f64a4a414) [#547](https://github.com/preactjs/wmr/pull/547) Thanks [@rschristian](https://github.com/rschristian)! - Corrects output when referrencing module with npm prefix

* [`18952d1`](https://github.com/preactjs/wmr/commit/18952d11280644670eb01f11fe89f37ee7177295) [#526](https://github.com/preactjs/wmr/pull/526) Thanks [@developit](https://github.com/developit)! - Bind to localhost by default instead of ::0 (in both `wmr start` and `wmr serve`).

- [`af3403b`](https://github.com/preactjs/wmr/commit/af3403b908aee17afefc45996767b089e6e22a99) [#546](https://github.com/preactjs/wmr/pull/546) Thanks [@marvinhagemeister](https://github.com/marvinhagemeister)! - Fix pre-rendering not supported in older node <12.22.0 versions

* [`19bb41c`](https://github.com/preactjs/wmr/commit/19bb41c9d929ff3f51d72030071d0ce55a7ef8db) [#523](https://github.com/preactjs/wmr/pull/523) Thanks [@JoviDeCroock](https://github.com/JoviDeCroock)! - Eagerly load "\_wmr.js" in the "index.html" file to provide graceful error-fallbacks

- [`4487b6c`](https://github.com/preactjs/wmr/commit/4487b6cf8cf2e288bb9e9b2a494aa7fa1954cfcd) [#536](https://github.com/preactjs/wmr/pull/536) Thanks [@developit](https://github.com/developit)! - Include `.wasm` files in streamed npm packages

* [`fa07bea`](https://github.com/preactjs/wmr/commit/fa07bea74639d7a78a0187a25265557ae2fe6b72) [#544](https://github.com/preactjs/wmr/pull/544) Thanks [@marvinhagemeister](https://github.com/marvinhagemeister)! - Add note on how to enable network access to startup screen

- [`30644b3`](https://github.com/preactjs/wmr/commit/30644b39434f1bfd82cd54302e37fbe601effdcf) [#520](https://github.com/preactjs/wmr/pull/520) Thanks [@marvinhagemeister](https://github.com/marvinhagemeister)! - Fix code frame indentation with tabs and remove ansi codes from code frames logged in the browser. And while we're at it make it pretty too!

* [`9a6777f`](https://github.com/preactjs/wmr/commit/9a6777ff186a288ce126d473013c41d1b8f33bc3) Thanks [@developit](https://github.com/developit)! - Fix router transitions between suspended routes

- [`09b40d9`](https://github.com/preactjs/wmr/commit/09b40d90dae7f8ef181b83e9a7a5e7ad17c8198d) [#548](https://github.com/preactjs/wmr/pull/548) Thanks [@rschristian](https://github.com/rschristian)! - Replaces premove with native fs.rmdir

* [`e72ff27`](https://github.com/preactjs/wmr/commit/e72ff274473b92cfd5dbcdc4d5ef3b7f5cd902d0) [#537](https://github.com/preactjs/wmr/pull/537) Thanks [@developit](https://github.com/developit)! - Process all CSS to compile nested selectors, instead of only CSS Modules.

- [`31c83e7`](https://github.com/preactjs/wmr/commit/31c83e74fc0814481445c4b152625041751c2a1f) [#522](https://github.com/preactjs/wmr/pull/522) Thanks [@marvinhagemeister](https://github.com/marvinhagemeister)! - Allow plugins to overwrite url and json loading behavior. Default loading semantics will only apply if no other prefix is present on the import specifier

* [`1907901`](https://github.com/preactjs/wmr/commit/1907901f49bb425c2b885e59e8fcd8cc778aeab5) [#513](https://github.com/preactjs/wmr/pull/513) Thanks [@marvinhagemeister](https://github.com/marvinhagemeister)! - Add more path resolution messages in debug mode

## 1.5.1

### Patch Changes

- [`91e797a`](https://github.com/preactjs/wmr/commit/91e797a8cbd2f205fb86668e66979bbf428776c6) [#511](https://github.com/preactjs/wmr/pull/511) Thanks [@marvinhagemeister](https://github.com/marvinhagemeister)! - Fix missing dependency `rollup-plugin-visualize` (bad publish of 1.5.0)

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
