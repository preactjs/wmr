import { join, dirname } from 'path';
// import { promises as fs } from 'fs';
// import nodePolyfills from 'rollup-plugin-node-polyfills';
// import terser from 'terser';
import { memo } from './utils.js';
import { resolvePackageVersion, loadPackageFile } from './registry.js';

// const moduleFiles = (await Promise.all(modules.map(loadPackageFiles))).reduce((map, files, index) => {
// 	map.set(modules[index].module, files);
// 	return map;
// }, new Map());

/** @returns {import('rollup').Plugin} */
export default function npmPlugin({ publicPath = '/@npm', prefix = '\0npm/' } = {}) {
	// TODO: this should happen on-the-fly
	// const moduleFiles = loadPackageFiles(normalizeSpecifier(specifier));

	return {
		name: 'npm-plugin',
		async resolveId(id, importer) {
			if (id.startsWith(publicPath)) return { id, external: true };

			if (id.startsWith(prefix)) id = id.substring(prefix.length);
			if (importer && importer.startsWith(prefix)) importer = importer.substring(prefix.length);

			// let module, path, version;
			/** @type {ReturnType <normalizeSpecifier>} */
			let meta;

			const importerMeta = importer && normalizeSpecifier(importer);

			if (id.match(/^\.\.?(\/|$)/)) {
				// ({ module, path, version } = importerInfo);
				meta = Object.assign({}, importerMeta);
				meta.path = join(dirname(meta.path), id);
				// console.log(`Relative: ${id} => ${meta.path}`);
			} else {
				// @TODO - need to clone here?
				meta = normalizeSpecifier(id);
				// ({ module, path, specifier, version } = normalizeSpecifier(id));

				// external module reference
				if (importerMeta && meta.specifier !== importerMeta.specifier) {
					// console.log(`External: ${id} => ${publicPath}/${id}`);
					return { id: `${publicPath}/${id}`, external: true };
					// return { id, external: true };
					// console.log(`External: ${id} => ${prefix}${id}`);
					// return { id: `${prefix}${id}`, external: true };
				}
			}

			// @latest --> @10.4.1
			await resolvePackageVersion(meta);

			let { module, version, path } = meta;

			const readFile = (path = '') => loadPackageFile({ module, version, path });
			const hasFile = path =>
				readFile(path)
					.then(() => true)
					.catch(() => false);

			let pkg;
			try {
				pkg = JSON.parse(await readFile('package.json'));
			} catch (e) {
				throw Error(`Invalid package.json for ${module}: ${e.message}`);
			}

			// console.log('got package.json for ' + module);

			if (pkg.exports) {
				//let remainder = parts.slice(i).join('/');
				const entry = path ? `./${path}` : '.';

				const mapped = resolveExportMap(pkg.exports, entry, ENV_KEYS);

				if (!mapped) {
					throw Error(`Unknown package export ${entry} in ${module}.\n\n${JSON.stringify(pkg.exports, null, 2)}`);
				}

				// true means directory access was allowed for this entry, but it was not resolved.
				if (mapped !== true) {
					return prefix + module + mapped.replace(/^\./, '');
				}
			}

			if (!path) {
				return prefix + module + getLegacyEntry(pkg);
			}

			// check if there's a sub-package.json (and get its contents)
			const subPkgJson = await readFile(path + '/package.json').catch(() => null);
			let subPkg = null;
			if (subPkgJson) {
				try {
					subPkg = JSON.parse(subPkgJson);
				} catch (e) {
					// there was a package.json, but it wasn't valid JSON...
					throw Error(`Invalid package.json at ${module}/${path}/package.json: ${e.message}`);
				}
			}
			if (subPkg) {
				return prefix + module + '/' + path + getLegacyEntry(subPkg);
			}

			// console.log('cjs resoltuion for ' + path);

			// fallback: implement basic commonjs-style resolution
			if (!(await hasFile(path)) && !/\.[a-z]{1,5}$/i.test(path)) {
				// console.log('  > extensionless');
				if (await hasFile(path + '/index.js')) {
					// console.log('  > found index.js');
					path += '/index.js';
				}
				if (await hasFile(path + '.js')) {
					// console.log('  > found .js extension');
					path += '.js';
				}
			} else {
				// console.log('  > exact match');
			}

			return prefix + module + '/' + path;

			/*
			const parts = [''].concat(path.split('/').filter(Boolean));
			let currentPath = '';
			for (let i=0; i<parts.length; i++) {
				currentPath += parts[i];
				const pkg = files.get(currentPath + '/package.json');
				if (!pkg) continue;
				if (pkg.exports) {
					let remainder = parts.slice(i).join('/');
					const key = remainder ? `./${remainder}` : '.';
					if (!Object.prototype.hasOwnProperty(key)) {
						throw Error(`Unknown package export ${key} in ${module}.`);
					}
					return currentPath + pkg.exports[key].replace(/^\./, '');
				}
			}
			*/
		},
		load(id) {
			if (!id.startsWith(prefix)) return;
			id = id.substring(prefix.length);

			const { module, version, path } = normalizeSpecifier(id);
			return loadPackageFile({ module, version, path });
		}
	};
}

/** Get the best possible entry from a package.json that doesn't have an Export Map */
function getLegacyEntry(pkg) {
	const entry = String(pkg.esmodules || pkg.modern || pkg.module || pkg['jsnext:main'] || pkg.browser || pkg.main);
	return entry.replace(/^\/?/, '/');
}

const ENV_KEYS = ['esmodules', 'import', 'require', 'browser', 'node', 'default'];

/** Get the best resolution for an entry from an Export Map
 * @param {Object} exp `package.exports`
 * @param {string} entry `./foo` or `.`
 * @param {string[]} [envKeys=ENV_KEYS] package environment keys
 */
function resolveExportMap(exp, entry, envKeys) {
	if (typeof exp === 'string') {
		// {"exports":"./foo.js"}
		// {"exports":{"./foo":"./foo.js"}}
		return exp;
	}
	let isFileListing;
	let isDirectoryExposed = false;
	for (let i in exp) {
		if (isFileListing === undefined) isFileListing = i[0] === '.';
		if (isFileListing) {
			// {"exports":{".":"./index.js"}}
			if (i === entry) {
				return resolveExportMap(exp[i], entry, envKeys);
			}
			if (!isDirectoryExposed && i.endsWith('/') && entry.startsWith(i)) {
				isDirectoryExposed = true;
			}
		} else if (envKeys.includes(i)) {
			// {"exports":{"import":"./foo.js"}}
			return resolveExportMap(exp[i], entry, envKeys);
		}
	}
	return isDirectoryExposed;
}

// function toIdentifier({ module, path, specifier }, allSpecifiers) {
// 	// check if this is the only path obtained from a given module. If it is, use the module name:
// 	if (allSpecifiers.filter(m => m.module === module).length === 1) {
// 		specifier = module.replace(/@[^/]+\//g, '');
// 	}
// 	return specifier.replace(/\/[a-z0-9]/g, s => s[1].toUpperCase()).replace(/[^a-z0-9]+/gi, '_');
// }

const PACKAGE_SPECIFIER = /^((?:@[a-z0-9-]{1,200}\/)?[a-z0-9-]{1,200})(?:@([a-z0-9^.~>=<-]{1,50}))?(?:\/(.*))?$/i;

export const normalizeSpecifier = memo(spec => {
	let [, module = '', version = '', path = ''] = spec.toLowerCase().match(PACKAGE_SPECIFIER) || [];
	if (!module) throw Error(`Invalid specifier: ${spec}`);
	version = version || 'latest';
	const specifier = module + (path ? '/' + path : '');
	return { module, version, path, specifier };
});
