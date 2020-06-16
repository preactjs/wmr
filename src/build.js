import { bundleProd } from './bundler.js';
import { bundleStats } from './lib/output-utils.js';
import { normalizeOptions } from './lib/normalize-options.js';

/**
 * @param {Parameters<bundleProd>[0]} options
 */
export default async function build(options = {}) {
	options.out = options.out || 'dist';

	options = await normalizeOptions(options);

	const bundleOutput = await bundleProd(options);

	const stats = bundleStats(bundleOutput);
	console.log(`Wrote ${stats.totalText} to disk:${stats.assetsText}`);
}
