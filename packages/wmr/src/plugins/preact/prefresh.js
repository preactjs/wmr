import MagicString from 'magic-string';
import path from 'path';

const PREFRESH = `
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

/**
 * Inject Prefresh runtime for on the fly hot module reloading
 * of Preact components.
 * @param {object} options
 * @param {boolean} options.sourcemap
 * @returns {import('rollup').Plugin}
 */
export function prefreshPlugin({ sourcemap }) {
	return {
		name: 'preact-prefresh',
		transform(code, id) {
			if (!/\.([tj]sx?|[mc]js)$/.test(id)) return;

			if (process.env.BYPASS_HMR === 'true') return;

			const hasExport = /\bexport\b/.test(code);
			const hasJsx = /<([a-zA-Z][a-zA-Z0-9.:-]*|\$\{.+?\})[^>]*>/.test(code);

			// Only inject into modules with JSX and exports
			if (!hasJsx || !hasExport) return;

			const s = new MagicString(code, {
				filename: id,
				// @ts-ignore
				indentExclusionRanges: undefined
			});

			s.prepend(`import '@prefresh/core';\n`);
			s.append('\n' + PREFRESH);

			return {
				code: s.toString(),
				map: sourcemap ? s.generateMap({ source: id, file: path.posix.basename(id), includeContent: true }) : null
			};
		}
	};
}
