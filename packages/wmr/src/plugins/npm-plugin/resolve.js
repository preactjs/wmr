import { resolve as _resolveExports, legacy as _resolveLegacyEntry } from 'resolve.exports';

function resolveExports(pkg, key) {
	const conditions = [process.env.NODE_ENV === 'production' ? 'production' : 'development', 'esmodules', 'module'];

	return _resolveExports(pkg, key, {
		browser: true,
		conditions
	});
}

function resolveLegacyEntry(pkg, path) {
	_resolveLegacyEntry(pkg, {
		browser: path,
		fields: ['esmodules', 'modern', 'module', 'jsnext:main']
	}) || 'index.js';
}

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
		// will normalize entry & will throw error if no match
		const mapped = resolveExports(pkg, path || '.');
		// `mapped:true` means directory access was allowed for this entry, but it was not resolved.
		if (!mapped.endsWith('/')) return mapped.replace(/^\./, '');
	}

	// path is a bare import of a package, use its legacy exports (module/main):
	if (!path) {
		path = resolveLegacyEntry(pkg, path || '.');
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
			path += resolveLegacyEntry(subPkg, '.');
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
