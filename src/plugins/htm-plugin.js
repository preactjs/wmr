import acornJsx from 'acorn-jsx';
import { transform } from './acorn-traverse.js';
import transformJsxToHtm from './transform-jsx-to-htm.js';

export default function htmPlugin({ } = {}) {
  return {
    name: 'htm-plugin',

    options(opts) {
      opts.acornInjectPlugins = [
        ...(opts.acornInjectPlugins || []),
        acornJsx()
      ];
      return opts;
    },

    transform(code, filename) {
      if (!filename.match(/^\/app\/public\//)) return;
      const start = Date.now();
      
      // const out = processJsx(this.parse(code), new MagicString(code));

      const out = transform(code, {
        plugins: [
          transformJsxToHtm
        ],
        filename,
        sourceMaps: true,
        parse: this.parse
      });
      
      const end = Date.now();
      if (end - start > 50) {
        console.log(`transform(${filename}): ${end - start}ms`);
      }
      return out;
    }
  }
};
