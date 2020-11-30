import middleware from './middleware.js';

export default function plugin(options) {
	function configure(config) {
		if (!config || config.mode === 'start') {
			config.middleware.push(middleware(config, options));
		}
		return config;
	}
	if (options.cwd) {
		return configure(options);
	}
	return configure;
}
