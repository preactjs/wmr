import { join, dirname } from 'path';
import { memo } from './utils.js';
import { resolvePackageVersion, loadPackageFile } from './registry.js';
import { resolveModule } from './resolve.js';

/**
 * @param {Object} options
 * @param {string} [options.publicPath] URL path prefix to use for npm module scripts
 * @param {string} [options.prefix] Import prefix to use internally for representing npm modules
 * @param {boolean} [options.external] If `false`, resolved npm dependencies will be inlined by Rollup.
 * @returns {import('rollup').Plugin}
 */
export default function npmPlugin({ publicPath = '/@npm', prefix = '\0npm/', external = true } = {}) {
	return {
		name: 'npm-plugin',
		async resolveId(id, importer) {
			if (id.startsWith(publicPath)) return { id, external };

			if (id.startsWith(prefix)) id = id.substring(prefix.length);
			if (importer && importer.startsWith(prefix)) importer = importer.substring(prefix.length);

			// let module, path, version;
			/** @type {ReturnType <normalizeSpecifier>} */
			let meta;

			const importerMeta = importer && !isDiskPath(importer) && normalizeSpecifier(importer);

			// A relative import from within a module (resolve based on importer):
			if (isDiskPath(id)) {
				// not an npm module
				if (!importerMeta) return;

				meta = Object.assign({}, importerMeta);
				meta.path = join(dirname(meta.path || ''), id);
			} else {
				// An absolute, self or bare import
				meta = normalizeSpecifier(id);

				// Mark everything except self-imports as external: (eg: "preact/hooks" importing "preact")
				// Note: if `external=false` here, we're building a combined bundle and want to merge npm deps.
				if (external && importerMeta && meta.specifier !== importerMeta.specifier) {
					return { id: `${publicPath}/${id}`, external: true };
					// return { id, external: true };
					// return { id: `${prefix}${id}`, external: true };
				}
			}

			// Resolve @latest --> @10.4.1
			await resolvePackageVersion(meta);

			// Compute the final path
			// const resolvedPath = await resolveModule(meta);
			const { module, version, path } = meta;
			const readFile = (path = '') => loadPackageFile({ module, version, path });
			const hasFile = path =>
				readFile(path)
					.then(() => true)
					.catch(() => false);
			const resolvedPath = await resolveModule(path, { readFile, hasFile });

			return prefix + meta.module + '@' + meta.version + '/' + resolvedPath.replace(/^\//, '');
		},
		load(id) {
			// only load modules this plugin resolved
			if (!id.startsWith(prefix)) return;
			id = id.substring(prefix.length);

			const spec = normalizeSpecifier(id);
			return loadPackageFile(spec);
		}
	};
}

const PACKAGE_SPECIFIER = /^((?:@[a-z0-9-]{1,200}\/)?[a-z0-9-]{1,200})(?:@([a-z0-9^.~>=<-]{1,50}))?(?:\/(.*))?$/i;

export const normalizeSpecifier = memo(spec => {
	let [, module = '', version = '', path = ''] = spec.match(PACKAGE_SPECIFIER) || [];
	if (!module) throw Error(`Invalid specifier: ${spec}`);
	version = (version || 'latest').toLowerCase();
	module = module.toLowerCase();
	const specifier = module + (path ? '/' + path : '');
	return { module, version, path, specifier };
});

function isDiskPath(filename) {
	return /^(\/|\.\.?(\/|$))/.test(filename);
}

// /** @param {import('./registry.js').Module} spec */
// async function resolveModule({ module, version, path }) {
// 	const readFile = (path = '') => loadPackageFile({ module, version, path });
// 	const hasFile = path =>
// 		readFile(path)
// 			.then(() => true)
// 			.catch(() => false);

// 	let pkg;
// 	try {
// 		pkg = JSON.parse(await readFile('package.json'));
// 	} catch (e) {
// 		throw Error(`Invalid package.json for ${module}: ${e.message}`);
// 	}

// 	// Package Export Maps
// 	if (pkg.exports) {
// 		const entry = path ? `./${path}` : '.';

// 		const mapped = resolveExportMap(pkg.exports, entry, ENV_KEYS);

// 		if (!mapped) {
// 			throw Error(`Unknown package export ${entry} in ${module}.\n\n${JSON.stringify(pkg.exports, null, 2)}`);
// 		}

// 		// true means directory access was allowed for this entry, but it was not resolved.
// 		if (mapped !== true) {
// 			return mapped.replace(/^\./, '');
// 		}
// 	}

// 	// path is a bare import of a package, use its legacy exports (module/main):
// 	if (!path) {
// 		return getLegacyEntry(pkg);
// 	}

// 	// fallback: implement basic commonjs-style resolution
// 	if (/\.([mc]js|[tj]sx?)$/i.test(path)) {
// 		return path;
// 	}

// 	// extensionless paths:
// 	if (await hasFile(path + '.js')) {
// 		return path + '.js';
// 	}

// 	// path is a directory, check for package.json:
// 	try {
// 		const subPkg = JSON.parse(await readFile(path + '/package.json'));
// 		return path + getLegacyEntry(subPkg);
// 	} catch (e) {}

// 	// fall back to implicit directory /index.js:
// 	if (await hasFile(path + '/index.js')) {
// 		return path + '/index.js';
// 	}

// 	return path;
// }

// /** Get the best possible entry from a package.json that doesn't have an Export Map */
// function getLegacyEntry(pkg) {
// 	const entry = String(pkg.esmodules || pkg.modern || pkg.module || pkg['jsnext:main'] || pkg.browser || pkg.main);
// 	return entry.replace(/^\/?/, '/');
// }

// const ENV_KEYS = ['esmodules', 'import', 'require', 'browser', 'node', 'default'];

// /** Get the best resolution for an entry from an Export Map
//  * @param {Object} exp `package.exports`
//  * @param {string} entry `./foo` or `.`
//  * @param {string[]} [envKeys=ENV_KEYS] package environment keys
//  * @returns {string | boolean} a resolved path, or a boolean indicating if the given entry is exposed
//  */
// function resolveExportMap(exp, entry, envKeys) {
// 	if (typeof exp === 'string') {
// 		// {"exports":"./foo.js"}
// 		// {"exports":{"./foo":"./foo.js"}}
// 		return exp;
// 	}
// 	let isFileListing;
// 	let isDirectoryExposed = false;
// 	for (let i in exp) {
// 		if (isFileListing === undefined) isFileListing = i[0] === '.';
// 		if (isFileListing) {
// 			// {"exports":{".":"./index.js"}}
// 			if (i === entry) {
// 				return resolveExportMap(exp[i], entry, envKeys);
// 			}
// 			if (!isDirectoryExposed && i.endsWith('/') && entry.startsWith(i)) {
// 				isDirectoryExposed = true;
// 			}
// 		} else if (envKeys.includes(i)) {
// 			// {"exports":{"import":"./foo.js"}}
// 			return resolveExportMap(exp[i], entry, envKeys);
// 		}
// 	}
// 	return isDirectoryExposed;
// }
