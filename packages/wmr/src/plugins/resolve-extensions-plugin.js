import { promises as fs } from 'fs';
import { resolve, dirname, join } from 'path';
import { fileExists } from './plugin-utils.js';

const EXTS = ['.js', '.cjs'];

const EXTS_TS = ['.ts', '.tsx'];

const MAINFIELDS = ['module', 'main'];

async function fstat(file) {
	try {
		return await fs.stat(file);
	} catch (e) {}
	return false;
}

/**
 * Resolve extensionless or directory specifiers by looking them up on the disk.
 * @param {object} [options]
 * @param {string[]} [options.extensions=['.js','/index.js']] File extensions/suffixes to check for
 * @param {boolean} [options.typescript] Also check for `.ts` and `.tsx` extensions
 * @param {boolean} [options.index] Also check for `/index.*` for all extensions
 * @param {string[]} [options.mainFields=['module','main']] If set, checks for package.json main fields
 * @returns {import('rollup').Plugin}
 */
export default function resolveExtensionsPlugin({
	extensions = EXTS,
	typescript,
	index,
	mainFields = MAINFIELDS
} = {}) {
	if (typescript) {
		extensions = extensions.concat(EXTS_TS);
	}
	if (index) {
		extensions = extensions.concat(extensions.map(e => `/index${e}`));
	}

	return {
		name: 'resolve-extensions-plugin',
		async resolveId(id, importer) {
			if (id[0] === '\0') return;
			if (/\.(tsx?|css|s[ac]ss|wasm)$/.test(id)) return;

			let resolved;
			try {
				resolved = await this.resolve(id, importer, { skipSelf: true });
			} catch (e) {}
			if (resolved) {
				id = resolved.id;
			} else if (importer) {
				id = resolve(dirname(importer), id);
			}

			const stats = await fstat(id);
			if (stats) {
				// If the resolved specifier is a file, use it.
				if (stats.isFile()) {
					return id;
				}

				// specifier resolved to a directory: look for package.json or ./index file
				if (stats.isDirectory()) {
					let pkgJson, pkg;
					try {
						pkgJson = await fs.readFile(resolve(id, 'package.json'), 'utf-8');
					} catch (e) {}
					if (pkgJson) {
						try {
							pkg = JSON.parse(pkgJson);
						} catch (e) {
							console.warn(`Failed to parse package.json: ${id}\n  ${e}`);
						}
					}
					if (pkg) {
						const field = mainFields.find(f => pkg[f]);
						if (field) {
							id = join(id, pkg[field]);
							if (/\.([mc]?js|jsx?)$/.test(id)) {
								return id;
							}
						} else {
							// package.json has an implicit "main" field of `index.js`:
							id = join(id, 'index.js');
						}
					}
				}
			}

			const p = id.replace(/\.[mc]?js$/, '');
			for (const suffix of extensions) {
				if (await fileExists(p + suffix)) {
					return p + suffix;
				}
			}
		}
	};
}
