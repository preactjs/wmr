import directoryPlugin from '../src/index.js';

export default function (config) {
  config.plugins.push(directoryPlugin(config));
}
