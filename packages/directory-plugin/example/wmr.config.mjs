import lsPlugin from '../src/index.js';

export default function (config) {
	console.log('config', config);
  config.plugins.push(lsPlugin(config));
}
