const path = require('path');

module.exports = function (config) {
	config.plugins.push({
		name: 'root-resolve',
		resolveId(spec, importer) {
			if (!spec.startsWith('~/')) return;
			return path.resolve(config.cwd, spec.substring(2));
		}
	});
};
