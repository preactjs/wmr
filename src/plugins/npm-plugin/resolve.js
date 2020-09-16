/**
 * @param {string} path
 * @param {{ readFile(f:string): Promise<string>, hasFile(f:string): Promise<boolean>, module?: string }} context
 */
export async function resolveModule(path, { readFile, hasFile, module }) {
	let pkg;
	try {
		pkg = JSON.parse(await readFile('package.json'));
	} catch (e) {
		throw Error(`Invalid package.json for ${module}: ${e.message}`);
	}

	// Package Export Maps
	if (pkg.exports) {
		const entry = path ? `./${path}` : '.';

		const mapped = resolveExportMap(pkg.exports, entry, ENV_KEYS);

		if (!mapped) {
			throw Error(`Unknown package export ${entry} in ${module}.\n\n${JSON.stringify(pkg.exports, null, 2)}`);
		}

		// true means directory access was allowed for this entry, but it was not resolved.
		if (mapped !== true) {
			return mapped.replace(/^\./, '');
		}
	}

	// path is a bare import of a package, use its legacy exports (module/main):
	if (!path) {
		path = getLegacyEntry(pkg);
	}

	// fallback: implement basic commonjs-style resolution
	if (/\.([mc]js|[tj]sx?)$/i.test(path)) {
		return path;
	}

	// path is a directory, check for package.json:
	try {
		const subPkg = JSON.parse(await readFile(path + '/package.json'));
		path += getLegacyEntry(subPkg);
	} catch (e) {}

	// extensionless paths:
	if (await hasFile(path + '.js')) {
		return path + '.js';
	}

	// fall back to implicit directory /index.js:
	if (await hasFile(path + '/index.js')) {
		return path + '/index.js';
	}

	return path;
}

/** Get the best possible entry from a package.json that doesn't have an Export Map */
function getLegacyEntry(pkg) {
	const entry = String(
		pkg.esmodules ||
			pkg.modern ||
			pkg.module ||
			pkg['jsnext:main'] ||
			(typeof pkg.browser === 'string' && pkg.browser) ||
			pkg.main ||
			'index.js'
	);
	return '/' + entry.replace(/^\.?\//, '');
}

const ENV_KEYS = ['esmodules', 'import', 'require', 'browser', 'node', 'default'];

/** Get the best resolution for an entry from an Export Map
 * @param {Object} exp `package.exports`
 * @param {string} entry `./foo` or `.`
 * @param {string[]} [envKeys=ENV_KEYS] package environment keys
 * @returns {string | boolean} a resolved path, or a boolean indicating if the given entry is exposed
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
