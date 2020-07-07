import path from 'path';
import fetch from 'node-fetch';
import Cache from 'async-disk-cache';

const PREFIX = '\bnpm/';
const PREFIX_INTERNAL = '\bnpd/';

/**
 * Progressively load and cache individual dependency modules from unpkg.com
 * @param {object} [options]
 * @returns {import('rollup').Plugin}
 */
export default function unpkgPlugin({ resolutions = new Map(), publicPath = '@npm/', perPackage = false } = {}) {
	const reverseResolutions = new Map();
	publicPath = publicPath.replace(/\/$/, '') + '/';

	function manualChunks(filename, { getModuleInfo }) {
		// if this is a submodule of a package entry, merge it into the entry:
		if (filename.startsWith(PREFIX_INTERNAL)) {
			const info = getModuleInfo(filename);
			filename = info.importers.find(p => p.startsWith('\bnpm/')) || filename;
		}

		let root = filename.substring(5);
		root = reverseResolutions.get(root) || root;
		// return '@npm/' + filename.substring(5).match(/^((?:@[^@/?]+\/)?[^@/?]+)/)[0];
		return publicPath + root.replace(/\//g, ':').replace(/\.([cm]js|[tj]sx?)$/, '');
	}

	return {
		name: 'unpkg-plugin',

		async resolveId(s, from) {
			if (/^[\b]np[md]\//.test(s)) s = s.substring(5);

			if (from && /^[\b]np[md]\//.test(from)) from = from.substring(5);

			const isRelativeToPackage = from && /^((?:@[^@/?]+\/)?[^@/?]+)(?:@[^/?]+)?(?:\/([^?]+))?(?:\?.*)?$/.test(from);
			const isRelativeImport = /^\.?\.?(\/|$)/.test(s);

			if (isRelativeImport) {
				// resolve relative imports from within a package:
				if (isRelativeToPackage) {
					s = path.join(path.dirname(from), s);
				} else {
					// otherwise it's a local import, don't process it:
					return null;
				}
			}

			// strip unpkg URL prefix:
			s = s.replace(/^https?:\/\/unpkg\.com\/((?:@[^@/?]+\/)?[^@/?]+)(@[^/?]+)?(\/[^?]+)?\?module/g, '$1$2$3');

			const resolved = await unpkgResolve(s);

			resolutions.set(s, resolved);
			reverseResolutions.set(resolved, s);

			const isInternalImport = isRelativeImport && from && isRelativeToPackage;
			if (isInternalImport) {
				return PREFIX_INTERNAL + resolved;
			}

			if (perPackage && from) {
				return { id: publicPath + s, external: true };
			}

			return PREFIX + resolved;
		},

		load(id) {
			if (/^[\b]np[md]\//.test(id)) {
				return unpkg(id.substring(5));
			}
		},

		options(options) {
			let mc = options.manualChunks;
			if (typeof mc === 'object') {
				const mapping = mc;
				// @TODO: this is probably not the same behavior as manualChunks:{}
				// https://github.com/rollup/rollup/blob/07e0b205c93a3953ec860fc496d8d3d36524f24a/src/ModuleLoader.ts#L186
				mc = filename => {
					for (const alias in mapping) {
						if (mapping[alias].includes(filename)) {
							return alias;
						}
					}
				};
			}
			return {
				...options,
				manualChunks(filename, ctx) {
					if (/^[\b]np[md]\//.test(filename)) {
						return manualChunks(filename, ctx);
					}

					if (typeof mc === 'function') {
						return mc.apply(this, arguments);
					}
				}
			};
		}
	};
}

const PACKAGE_CACHE = new Cache('unpkg-meta');
const FILE_CACHE = new Cache('unpkg-plugin');

// PACKAGE_CACHE.clear();
// FILE_CACHE.clear();

/*
 * @typedef AnyCache
 * @property {(key: string) => Promise<{isCached:boolean, value?:string}>} get
 * @property {(key: string, value: string) => void} set
 */

/**
 * Memoize backed by layered in-memory & disk caches.
 * @template {function} T
 * @param {any} cache
 * @param {T} fn
 * @returns {((...rest: Parameters<T>) => ReturnType<T>)}
 */
function withCache(cache, fn) {
	const memory = new Map();
	// @ts-ignore
	return async (...args) => {
		const key = String(args[0]);
		if (memory.has(key)) return memory.get(key);
		const entry = await cache.get(key);
		if (entry.isCached) {
			const value = JSON.parse(entry.value);
			memory.set(key, value);
			return value;
		}
		const p = fn(...args);
		memory.set(key, p);
		const v = await p;
		memory.set(key, v);
		cache.set(key, JSON.stringify(v));
		return v;
	};
}
// withCache = (c, fn) => fn;

// Manually defined export maps for troublesome packages
const EXPORTMAPS = {
	htm: {
		'.': './dist/htm.module.js',
		'./preact': './preact/index.module.js',
		'./': './'
	}
};

// Properties to strip from package.json files before caching
const USELESS_PROPERTIES = ['jest', 'eslintConfig', 'babel', 'scripts', 'devDependencies'];

const getPackageInfo = withCache(PACKAGE_CACHE, async id => {
	const res = await fetch(`https://unpkg.com/${id}/package.json`);
	if (!res.ok) throw `Module ${id} not found.`;
	const pkg = await res.json();
	for (const prop of USELESS_PROPERTIES) {
		if (prop in pkg) {
			delete pkg[prop];
		}
	}
	return pkg;
});

/**
 * Resolve a specifier using package metadata fetched from unpkg
 * @param {string} id
 */
async function unpkgResolve(id) {
	let [, name, path = ''] = id.match(/^((?:@[^@/?]+\/)?[^@/?]+)(?:@[^/?]+)?(?:\/([^?]+))?(?:\?.*)?$/);
	const info = await getPackageInfo(name);

	if (!info.exports && EXPORTMAPS.hasOwnProperty(name)) {
		info.exports = EXPORTMAPS[name];
	}

	if (info.exports) {
		// export maps
		const exp = ('./' + path.replace(/^\.?\//, '')).replace(/\/$/g, '');
		const entry = info.exports[exp];
		if (entry) {
			let p = (typeof entry === 'string' && entry) || entry.browser || entry.module || entry.umd || entry.default;
			if (!p) throw `Invalid Export Map entry for ${exp}`;
			path = p.replace(/^\.?\/?/g, '');
		} else if (!info.exports['./']) {
			throw `No matching Export Map entry for ${exp}.`;
		}
	} else {
		// bare imports route through package entry fields:
		if (!path) {
			path = info.esmodules || info.module || info['jsnext:main'] || info.browser || info.main;
		}

		if (!path.match(/\.([mc]js|[tj]sx?)$/g)) path += '.js';

		// if (!path) {
		// 	console.log('falling back to ?module lookup for ', id);
		// 	path += '?module';
		// }
	}

	return name + (path ? `/${path}` : '');
}

const unpkg = withCache(FILE_CACHE, async id => {
	// const path = await unpkgResolve(id);
	// const res = await fetch(`https://unpkg.com/${name}/${path}`);
	const res = await fetch(`https://unpkg.com/${id}`);
	if (!res.ok) throw `Module ${id} not found.`;
	return await res.text();
});
