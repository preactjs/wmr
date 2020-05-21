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

export default function wmrPlugin({} = {}) {
  const wmr = fs.readFile(new URL('./client.js', import.meta.url), 'utf8');
  return {
    name: 'wmr',
    resolveId(s) {
      if (s=='wmr') return '\0wmr.js';
    },
    load(s) {
      if (s=='\0wmr.js') return wmr;
    },
    resolveImportMeta(property, { moduleId }) {
      if (property === 'hot') {
        return `$IMPORT_META_HOT$`;
      }
      return null;
    },
    transform(code, id) {
      const s = new MagicString(code, { filename: id });
      let hasHot = false;
      if (code.match(/module\.hot/)) {
        // code = `const module={hot:import.meta.hot};\n${code}`;
        hasHot = true;
        s.prepend('const module={hot:import.meta.hot};\n');
      }
      if (code.match(/<\/([a-z][a-z0-9.:-]*)?>/i)) {
        hasHot = true;
        // code += '\n' + PREFRESH;
        s.append('\n' + PREFRESH);
      }
      if (hasHot || code.match(/(import\.meta\.hot|\$IMPORT_META_HOT\$)/)) {
       // code = `import { createHotContext as $createHotContext$ } from 'wmr';\nconst $IMPORT_META_HOT$ = $createHotContext$(import.meta.url);\n${code}`;
       s.prepend(
         `import { createHotContext as $createHotContext$ } from 'wmr';` +
         `const $IMPORT_META_HOT$ = $createHotContext$(import.meta.url);`
       );
      }
      //if (code.match(/import\.meta\.hot/)) {
      //  code = `import { createHotContext as $createHotContext$ } from 'wmr';\nimport.meta.hot = $createHotContext$(import.meta.url);\n`;
      //}
      return {
        code: s.toString(),
        map: s.generateMap({ includeContent: false })
      };
    }
  }
}