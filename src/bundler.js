import { relative, resolve } from 'path';
import * as rollup from 'rollup';
import watcherPlugin from './plugins/watcher-plugin.js';
import unpkgPlugin from './plugins/unpkg-plugin.js';
import htmPlugin from './plugins/htm-plugin.js';
import wmrPlugin from './plugins/wmr/plugin.js';
import wmrStylesPlugin from './plugins/wmr/styles-plugin.js';
import glob from 'tiny-glob';

export default function bundler({ sourcemap = false, onError, onBuild }) {
  const watchedFiles = glob('public/**/*.!({js,cjs,mjs,ts,tsx})', { filesOnly: true });

  const changedFiles = new Set();
  let builtChanges = [];

  const watcher = rollup.watch({
    input: './public/index.js',
    output: {
      sourcemap,
      sourcemapPathTransform: p => 'source://' + resolve('.', p).replace(/\/public\//g,'/'),
      preferConst: true,
      dir: '.dist'
    },
    treeshake: false,
    preserveModules: true,
    watch: {
      // chokidar: {
      //   cwd: './public'
      // }
    },
    plugins: [
      watcherPlugin({
        cwd: 'public',
        watchedFiles,
        onChange(filename) {
          changedFiles.add(filename);
        }
      }),
      wmrStylesPlugin(),
      wmrPlugin(),
      htmPlugin(),
      unpkgPlugin()
    ]
  });

  watcher.on('event', event => {
    switch (event.code) {
      case 'ERROR':
        let { code, plugin, message } = event.error;

        let preamble = `Error(${code.replace('_ERROR','')}): `;
        if (code === 'PLUGIN_ERROR') preamble = `Error(${plugin}): `;
        let err = `${preamble}${message}`;
        event.error.message = err;

        // normalize source paths for use on the client
        event.error.clientMessage = err.replace(/ \(([^(]+):(\d+):(\d+)\)/, (s, file, line, col) => {
          let relativePath = '/' + relative('public', file);
          // if sourcemaps are enabled, link to them in the client error:
          if (sourcemap) relativePath = 'source://' + relativePath;
          return ` (${relativePath}:${line}:${col})`;
        });

        if (onError) onError(event.error);
        break;
      case 'START':
        builtChanges = [...changedFiles];
        changedFiles.clear();
        break;
      case 'BUNDLE_END':
        console.log('Bundled in ' + event.duration + 'ms');
        if (onBuild) onBuild({ changes: builtChanges, ...event });
        break;
      case 'BUNDLE_START':
        break;
      case 'END':
        break;
    }
  });

  return watcher;
}
