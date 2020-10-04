/**
 * @param {string} path
 * @param {object} context
 * @param {(f: string) => Promise<string>} context.readFile Reads a file within the package directory
 * @param {(f: string) => Promise<boolean>} context.hasFile Checks for the existence of a file within the package directory
 * @param {string} [context.module] The module/package name
 * @param {boolean} [context.internal = false] Resolve `path` as an internal specifier - obeys Export Map, but falls back to direct resolution.
 */
export async function resolveModule(path, { readFile, hasFile, module, internal }) {
	let pkg;
	try {
		pkg = JSON.parse(await readFile('package.json'));
	} catch (e) {
		throw Error(`Invalid package.json for ${module}: ${e.message}`);
	}

	// Many early adopters of Export Maps use invalid specifiers,
	// relying on CommonJS semantics like extensionless imports.
	// To address this, we resolve extensionless internal imports.
	const isExportMappedSpecifier = pkg.exports && internal;

	// Package Export Maps
	if (!internal && pkg.exports) {
		const entry = path ? `./${path}` : '.';

		const mapped = resolveExportMap(pkg.exports, entry, ENV_KEYS);

		if (!mapped) {
			throw new Error(`Unknown package export ${entry} in ${module}.\n\n${JSON.stringify(pkg.exports, null, 2)}`);
		}

		// `mapped:true` means directory access was allowed for this entry, but it was not resolved.
		if (mapped !== true && !internal) {
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
	// (this is skipped )
	if (!isExportMappedSpecifier) {
		try {
			const subPkg = JSON.parse(await readFile(path + '/package.json'));
			path += getLegacyEntry(subPkg);
		} catch (e) {}
	}

	// extensionless paths:
	if (await hasFile(path + '.js')) {
		return path + '.js';
	}

	// fall back to implicit directory /index.js:
	if (!isExportMappedSpecifier && (await hasFile(path + '/index.js'))) {
		return path + '/index.js';
	}

	return path;
}

/**
 * Get the best possible entry from a package.json that doesn't have an Export Map
 * @TODO this does not currently support {"browser":{"./foo.js":"./browser-foo.js"}}
 */
function getLegacyEntry(pkg) {
	const mainFields = [pkg.esmodules, pkg.modern, pkg.module, pkg['jsnext:main'], pkg.browser, pkg.main, 'index.js'];
	const entry = mainFields.find(p => p && typeof p === 'string');
	return '/' + entry.replace(/^\.?\//, '');
}

const ENV_KEYS = ['esmodules', 'import', 'require', 'browser', 'node', 'default'];

/** Get the best resolution for an entry from an Export Map
 * @param {Object} exp `package.exports`
 * @param {string} entry `./foo` or `.`
 * @param {string[]} envKeys package environment keys
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
