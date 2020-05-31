import { promises as fs } from 'fs';
import MagicString from 'magic-string';

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
const wmr = fs.readFile(new URL('./client.js', __filename), 'utf-8');

export function getWmrClient() {
	return wmr;
}

/**
 * Implements Hot Module Replacement.
 * Conforms to the {@link esm-hmr https://github.com/pikapkg/esm-hmr} spec.
 * @param {object} options
 * @returns {import('rollup').Plugin}
 */
export default function wmrPlugin({} = {}) {
	return {
		name: 'wmr',
		resolveId(s) {
			if (s == 'wmr') return '\0wmr.js';
		},
		load(s) {
			if (s == '\0wmr.js') return wmr;
		},
		resolveImportMeta(property) {
			if (property === 'hot') {
				return `$IMPORT_META_HOT$`;
			}
			return null;
		},
		transform(code, id) {
			let hasHot = /(import\.meta\.hot|\$IMPORT_META_HOT\$)/.test(code);
			let before = '';
			let after = '';

			// stub webpack-style `module.hot` using `import.meta.hot`:
			if (code.match(/module\.hot/)) {
				hasHot = true;
				before += 'const module={hot:import.meta.hot};\n';
			}

			// detect JSX and inject prefresh: (@todo: move to separate plugin)
			if (code.match(/<\/([a-z][a-z0-9.:-]*)?>/i)) {
				hasHot = true;
				after += '\n' + PREFRESH;
			}

			if (!hasHot) return null;

			const s = new MagicString(code, {
				filename: id,
				indentExclusionRanges: undefined
			});
			s.append(after);
			s.prepend(
				`import { createHotContext as $createHotContext$ } from 'wmr';const $IMPORT_META_HOT$ = $createHotContext$(import.meta.url);${before}`
			);
			return {
				code: s.toString(),
				map: s.generateMap({ includeContent: false })
			};
		}
	};
}
