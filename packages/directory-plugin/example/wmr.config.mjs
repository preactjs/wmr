import lsPlugin from '../src/index.js';

export default function (config) {
  config.plugins.push(lsPlugin(config));
}
