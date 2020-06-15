import { promises as fs } from 'fs';
import bundler from './bundler.js';

export default async function build(options = {}) {
	if (!options.cwd) {
		if ((await fs.stat('public')).isDirectory()) {
			options.cwd = 'public';
		}
	}

	bundler(options, false);
}
