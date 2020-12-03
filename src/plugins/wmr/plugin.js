import { promises as fs } from 'fs';
import MagicString from 'magic-string';
import { ESM_KEYWORDS } from '../fast-cjs-plugin.js';

const BYPASS_HMR = process.env.BYPASS_HMR === 'true';

const PREFRESH = `
import '@prefresh/core';
if (import.meta.hot) {
  let a=0, m=import(import.meta.url);
  import.meta.hot.accept(async ({module}) => {
    m = await m;
    try {
      if (!a++) for (let i in module) self.__PREFRESH__.replaceComponent(m[i], module[i]);
    } catch (e) {
      import.meta.hot.invalidate();
      throw e;
    }
  });
}
`;

// @ts-ignore
const __filename = import.meta.url;
// rollup-inline-files
const wmrClientPromise = fs.readFile(new URL('./client.js', __filename), 'utf-8');
const wmrProdClientPromise = fs.readFile(new URL('./client-prod.js', __filename), 'utf-8');

export function getWmrClient({ hot = true } = {}) {
	if (BYPASS_HMR) hot = false;
	return hot ? wmrClientPromise : wmrProdClientPromise;
}

/**
 * Implements Hot Module Replacement.
 * Conforms to the {@link esm-hmr https://github.com/pikapkg/esm-hmr} spec.
 * @param {object} options
 * @returns {import('rollup').Plugin}
 */
export default function wmrPlugin({ hot = true } = {}) {
	if (BYPASS_HMR) hot = false;

	return {
		name: 'wmr',
		resolveId(s) {
			if (s == 'wmr') return '\0wmr.js';
		},
		load(s) {
			if (s == '\0wmr.js') return getWmrClient({ hot });
		},
		resolveImportMeta(property) {
			if (property === 'hot') {
				return hot ? `$IMPORT_META_HOT$` : 'undefined';
			}
			return null;
		},
		transform(code, id) {
			const ch = id[0];
			if (ch === '\0' || ch === '\b' || !/\.[tj]sx?$/.test(id)) return;
			let hasHot = /(import\.meta\.hot|\$IMPORT_META_HOT\$)/.test(code);
			let before = '';
			let after = '';

			// stub webpack-style `module.hot` using `import.meta.hot`:
			if (code.match(/module\.hot/)) {
				hasHot = true;
				before += `const module={${hot ? 'hot:import.meta.hot' : ''}};\n`;
			}

			const hasEsmKeywords = ESM_KEYWORDS.test(code);
			const hasExport = code.match(/\bexport\b/);

			// Detect modules that appear to have both JSX and an export, and inject prefresh:
			// @todo: move to separate plugin.
			// if (code.match(/\/\*@@prefresh_include\*\//) && code.match(/\bexport\b/)) {
			if (code.match(/html`[^`]*<([a-zA-Z][a-zA-Z0-9.:-]*|\$\{.+?\})[^>]*>/) && hasExport) {
				// if (this.getModuleInfo(id).hasJSX) {
				hasHot = true;
				after += '\n' + PREFRESH;
				// }
			}

			if ((!hot && !hasHot) || !hasEsmKeywords) return null;

			const s = new MagicString(code, {
				filename: id,
				// Typings from MagicString are wrong, see: https://github.com/Rich-Harris/magic-string/pull/182
				// @ts-ignore
				indentExclusionRanges: undefined
			});

			if (hot) {
				if (!hasHot) {
					s.append(`\nimport { createHotContext as $w_h$ } from 'wmr'; $w_h$(import.meta.url);`);
				} else {
					s.append(after);
					s.prepend(
						`import { createHotContext as $createHotContext$ } from 'wmr';const $IMPORT_META_HOT$ = $createHotContext$(import.meta.url);${before}`
					);
				}
			} else if (!BYPASS_HMR) {
				// TODO: this should be able to be omitted unconditionally.
				s.prepend(`const $IMPORT_META_HOT$ = undefined;${before}`);
			}

			return {
				code: s.toString(),
				map: s.generateMap({ includeContent: false })
			};
		}
	};
}
