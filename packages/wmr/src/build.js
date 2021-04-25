import * as kl from 'kolorist';
import { promises as fs } from 'fs';
import { bundleProd } from './bundler.js';
import { bundleStats } from './lib/output-utils.js';
import { prerender } from './lib/prerender.js';
import { normalizeOptions } from './lib/normalize-options.js';
import { setCwd } from './plugins/npm-plugin/registry.js';

/**
 * @param {Parameters<bundleProd>[0] & { prerender?: boolean }} options
 */
export default async function build(options = {}) {
	options.out = options.out || 'dist';

	// @todo remove this hack once registry.js is instantiable
	setCwd(options.cwd);

	options = await normalizeOptions(options, 'build');

	await fs.rmdir(options.out, { recursive: true });

	const bundleOutput = await bundleProd(options);

	const stats = bundleStats(bundleOutput);
	process.stdout.write(kl.bold(`Wrote ${stats.totalText} to disk:`) + stats.assetsText + '\n');

	if (!options.prerender) return;

	const { routes } = await prerender(options);
	const routeMap = routes.reduce((s, r) => {
		s += `\n  ${r.url}`;
		if (r._discoveredBy) s += kl.dim(` [from ${r._discoveredBy.url}]`);
		return s;
	}, '');
	process.stdout.write(kl.bold(`Prerendered ${routes.length} page${routes.length == 1 ? '' : 's'}:`) + routeMap + '\n');
}
