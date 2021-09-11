import * as rollup from 'rollup';
import path from 'path';
import { promises as fs } from 'fs';
import { browserFieldPlugin } from './browser-field.js';

/**
 * @param {string} modDir
 * @param {string} pkgName
 * @param {string} id
 */
export async function npmBundle(modDir, pkgName, id) {
	// Now we can attempt to resolve the package entry point.
	// Load `package.json` to resolve package entry points
	const pkg = JSON.parse(await fs.readFile(path.join(modDir, 'package.json'), 'utf-8'));

	const isMainEntry = pkgName === id;
	let entries = [];
	if (pkg.exports) {
		// FIXME
		throw new Error('TODO');
	} else if (isMainEntry) {
		entries.push(path.join(modDir, pkg.module ? pkg.module : pkg.main));
	} else {
		// Legacy deep import
		entries.push(path.join(modDir, id.slice(id.indexOf('/'))));
	}

	const bundle = await rollup.rollup({
		input: 'virtual-entry',

		plugins: [
			browserFieldPlugin({ modDir, browser: pkg.browser || {} }),
			{
				name: 'virtual-entry',
				resolveId(id) {
					if (id === 'virtual-entry') return id;
				},
				async load(id) {
					if (id !== 'virtual-entry') return;

					// TODO: Is picking a name a good idea?
					// or should we use dynamic imports everywhere instead?
					const code = entries.map(entry => `export * from "${entry}";`).join('\n');

					return code;
				}
			}
		]
	});

	const result = await bundle.generate({
		format: 'esm'
	});

	return result;
}
