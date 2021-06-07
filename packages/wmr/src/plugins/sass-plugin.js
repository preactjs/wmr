import { promisify } from 'util';
import * as kl from 'kolorist';
import { promises as fs } from 'fs';
import { debug } from '../lib/output-utils.js';

let sass;

const log = debug('sass');

/**
 * @param {import('node-sass').Options} opts
 * @returns {Promise<{ css: string, map?: string, includedFiles: string[] }>}
 */
async function renderSass(opts) {
	if (!sass) {
		for (const lib of ['sass', 'node-sass']) {
			try {
				let mod = await import(lib);
				mod = 'default' in mod ? mod.default : mod;
				sass = promisify(mod.render);
				log(`Using package ${kl.cyan(lib)} for sass compilation`);
			} catch (e) {}
		}

		if (!sass) {
			console.warn(
				kl.yellow(
					`Please install a sass implementation to use sass/scss:\n    npm i -D sass\n  or:\n    npm i -D node-sass`
				)
			);
			sass = ({ data }) => Promise.resolve({ css: data, map: null, stats: { includedFiles: [] } });
		}
	}

	const result = await sass(opts);
	return {
		css: result.css.toString(),
		map: result.map && result.map.toString(),
		includedFiles: result.stats.includedFiles
	};
}

/**
 * Transform SASS files with node-sass.
 * @param {object} [opts]
 * @param {boolean} [opts.production]
 * @param {boolean} [opts.sourcemap]
 * @returns {import('rollup').Plugin}
 */
export default function sassPlugin({ production = false, sourcemap = false } = {}) {
	/** @type {Map<string, Set<string>>} */
	const fileToBundle = new Map();

	return {
		name: 'sass',
		async load(id) {
			if (id[0] === '\0') return;
			if (!/\.s[ac]ss$/.test(id)) return;

			const code = await fs.readFile(id, 'utf-8');

			const result = await renderSass({
				data: code,
				file: id,
				outputStyle: production ? 'compressed' : undefined,
				sourceMap: sourcemap !== false
			});

			// Store input mappings for watcher
			result.includedFiles.forEach(file => {
				const value = fileToBundle.get(file) || new Set();
				value.add(id);
				fileToBundle.set(file, value);
				this.addWatchFile(file);
			});

			return {
				code: result.css,
				map: (sourcemap && result.map) || null
			};
		},
		// TODO: Teach plugin container change events to distinguish
		// deletions from updates.
		watchChange(id) {
			// Invalidate bundle (wmr-specific)
			return fileToBundle.get(id);
		}
	};
}
