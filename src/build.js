import { bundleStats } from './lib/output-utils.js';
import { normalizeOptions } from './lib/normalize-options.js';
import { setCwd } from './plugins/npm-plugin/registry.js';

/**
 * @param {Parameters<import('./bundler')['bundleProd']>[0]} options
 */
export default async function build(options = {}) {
	options.out = options.out || 'dist';

	// @todo remove this hack once registry.js is instantiable
	setCwd(options.cwd);

	options = await normalizeOptions(options);

	const { bundleProd } = await import('./bundler.js');

	const bundleOutput = await bundleProd(options);

	const stats = bundleStats(bundleOutput);
	console.log(`Wrote ${stats.totalText} to disk:${stats.assetsText}`);
}
