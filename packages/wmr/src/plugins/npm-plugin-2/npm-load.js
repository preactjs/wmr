import path from 'path';
import { promises as fs } from 'fs';
import * as kl from 'kolorist';
import { getPackageInfo, isValidPackageName, resolvePackageExport } from './utils.js';
import { readJson } from '../../lib/fs-utils.js';
import { debug } from '../../lib/output-utils.js';

const log = debug('npm-load');

/**
 * @param {object} options
 * @param {Map<string, string>} options.browserReplacement
 * @returns {import('rollup').Plugin}
 */
export function npmLoad({ browserReplacement }) {
	return {
		name: 'npm-load',
		async resolveId(id, importer) {
			if (importer && isValidPackageName(importer)) {
				const info = this.getModuleInfo(importer);
				return this.resolve(id, info?.meta.wmr.entry, { skipSelf: true });
			}
		},
		async load(id) {
			if (!isValidPackageName(id)) return;

			const info = this.getModuleInfo(id);

			const { modDir } = info?.meta?.wmr;
			const pkg = await readJson(path.join(modDir, 'package.json'));
			const { pathname, name } = getPackageInfo(id);

			if (typeof pkg.browser === 'object') {
				for (let [spec, replacement] of Object.entries(pkg.browser)) {
					// Formats:
					//   "foo" -> Can be `foo` or `<pkg>/foo.js`
					//   "foo/bar" -> Can be `foo/bar` or `<pkg>/foo/bar.js`
					//   "./foo/bar" -> `<pkg>/foo/bar.js`
					//   "../foo" -> INVALID
					//   "." -> INVALID
					spec = path.posix.normalize(spec);
					const idPrefix = replacement.startsWith('./') ? './' : '';
					replacement = idPrefix + path.posix.normalize(replacement);

					// Check for invalid paths
					if (spec.startsWith('..') || spec === '.' || replacement.startsWith('..') || replacement === '.') {
						continue;
					}

					// Add bare entry as is, in case it refers to a package
					if (!spec.startsWith('./')) {
						browserReplacement.set(spec, replacement);
					}

					browserReplacement.set(path.join(modDir, spec), replacement);
				}
			}

			let entry = '';
			// Package exports
			if (pkg.exports) {
				const found = resolvePackageExport(pkg, pathname);
				if (!found) {
					throw new Error(`Unable to resolve entry in module "${pkg.name}"`);
				}

				entry = path.join(modDir, found);
			} else if (!pathname) {
				entry = path.join(modDir, pkg.module || pkg.main);
			} else {
				// Special case: Deep import may itself be a replaced path
				const replaced = browserReplacement.get(pathname);
				if (replaced) {
					const resolved = await this.resolve(`./${replaced}`, path.join(modDir, pkg.name), { skipSelf: true });

					entry = resolved ? resolved.id : path.join(modDir, replaced);
				} else {
					// Check if the package is a legacy sub-package. This
					// was used before the "export" field became a thing.
					try {
						const subPkg = await readJson(path.join(modDir, pathname, 'package.json'));
						entry = path.join(modDir, pathname, subPkg.module || subPkg.main);
					} catch (err) {
						entry = pathname;
					}
				}
			}

			const code = await fs.readFile(entry, 'utf-8');

			log(`loaded ${kl.cyan(id)} ${kl.dim(`from ${entry}`)}`);

			return {
				code,
				// FIXME: Load existing sourcemap if any
				map: null,
				moduleSideEffect: false,
				meta: {
					wmr: {
						entry,
						modName: name,
						modDir
					}
				}
			};
		}
	};
}
