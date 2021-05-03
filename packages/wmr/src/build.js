import * as kl from 'kolorist';
import { promises as fs } from 'fs';
import path from 'path';
import { rm } from './lib/fs-utils.js';
import { bundleProd } from './bundler.js';
import { bundleStats } from './lib/output-utils.js';
import { prerender } from './lib/prerender.js';
import { normalizeOptions } from './lib/normalize-options.js';
import { setCwd } from './plugins/npm-plugin/registry.js';

/**
 * @param {Parameters<bundleProd>[0] & { prerender?: boolean }} options
 */
export default async function build(options) {
	options.out = options.out || 'dist';

	// @todo remove this hack once registry.js is instantiable
	setCwd(options.cwd);

	options = await normalizeOptions(options, 'build');

	// Clears out the output folder without deleting it -- useful
	// when mounted with Docker and the like
	await Promise.all((await fs.readdir(options.out)).map(item => rm(path.join(options.out, item), { recursive: true })));

	const bundleOutput = await bundleProd(options);

	const stats = bundleStats(bundleOutput, path.relative(options.root, options.out));
	process.stdout.write(kl.bold(`\nWrote ${stats.totalText} to disk:`) + stats.assetsText + '\n');

	if (!options.prerender) return;

	const { routes } = await prerender(options);
	const routeMap = routes.reduce((s, r) => {
		s += `\n  ${r.url}`;
		if (r._discoveredBy) s += kl.dim(` [from ${r._discoveredBy.url}]`);
		return s;
	}, '');
	process.stdout.write(kl.bold(`Prerendered ${routes.length} page${routes.length == 1 ? '' : 's'}:`) + routeMap + '\n');
}
