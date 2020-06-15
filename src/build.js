import { promises as fs } from 'fs';
import { bundleProd } from './bundler.js';
import { bundleStats } from './lib/output-utils.js';

export default async function build(options = {}) {
	if (!options.cwd) {
		if ((await fs.stat('public')).isDirectory()) {
			options.cwd = 'public';
		}
	}

	const bundleOutput = await bundleProd(options);

	const stats = bundleStats(bundleOutput);
	console.log(`Wrote ${stats.totalText} to disk:${stats.assetsText}`);
}
