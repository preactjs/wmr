import path from 'path';
import fetch from 'node-fetch';
import Cache from 'async-disk-cache';

/**
 * Progressively load and cache individual dependency modules from unpkg.com
 * @param {object} [options]
 * @returns {import('rollup').Plugin}
 */
export default function unpkgPlugin({ } = {}) {
	return {
		name: 'unpkg-plugin',
		async resolveId(s, from) {
      if (s.startsWith('\0npm/')) s = s.substring(5);
      
      if (from && from.startsWith('\0npm/')) from = from.substring(5);

      if (s.match(/^\.\.?\//) && from && from.match(/^((?:@[^@\/?]+\/)?[^@\/?]+)(?:@[^\/?]+)?(?:\/([^?]+))?(?:\?.*)?$/)) {
        s = path.join(path.dirname(from), s);
      }
			if (s.match(/^\.?\//)) {
        return null;
      }
			s = s.replace(/^https?:\/\/unpkg\.com\/((?:@[^@\/?]+\/)?[^@\/?]+)(@[^\/?]+)?(\/[^?]+)?\?module/g, '$1$2$3');
      const resolved = await unpkgResolve(s);
      return '\0npm/' + resolved;
		},
		load(id) {
			// if (id.match(/^\.?\//)) return;
      if (id.startsWith('\0npm/')) {
        return unpkg(id.substring(5));
      }
		}
	};
}


const PACKAGE_CACHE = new Cache('unpkg-meta');
const FILE_CACHE = new Cache('unpkg-plugin');

// PACKAGE_CACHE.clear();
// FILE_CACHE.clear();

/**
 * @typedef AnyCache
 * @property {(key: string) => Promise<{isCached:boolean, value?:string}>} get
 * @property {(key: string, value: string) => void} set
 */

/**
 * Memoize backed by layered in-memory & disk caches.
 * @template {function} T
 * @param {AnyCache} cache
 * @param {T} fn
 * @returns {((...rest: Parameters<T>) => PromiseLike<ReturnType<T>>)}
 */
function withCache(cache, fn) {
  const memory = new Map();
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
  }
}
// withCache = (c, fn) => fn;

// Manually defined export maps for troublesome packages
const EXPORTMAPS = {
  'htm': {
    '.': './dist/htm.module.js',
    './preact': './preact/index.module.js',
    './': './'
  }
}

// Properties to strip from package.json files before caching
const USELESS_PROPERTIES = [
  'jest',
  'eslintConfig',
  'babel',
  'scripts',
  'devDependencies'
];

const getPackageInfo = withCache(PACKAGE_CACHE, async (id) => {
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
  // return;
  let [, name, path = ''] = id.match(/^((?:@[^@\/?]+\/)?[^@\/?]+)(?:@[^\/?]+)?(?:\/([^?]+))?(?:\?.*)?$/);
  const info = await getPackageInfo(name);

  if (!info.exports && EXPORTMAPS.hasOwnProperty(name)) {
    info.exports = EXPORTMAPS[name];
  }

  let sloppyPath;
  if (info.exports) {
    // export maps
    const exp = ('./' + path.replace(/^\.?\//, '')).replace(/\/$/g,'');
    const entry = info.exports[exp];
    if (entry) {
      let p = (typeof entry==='string' && entry) || entry.browser || entry.module || entry.umd || entry.default;
      if (!p) throw `Invalid Export Map entry for ${exp}`;
      path = p.replace(/^\.?\/?/g,'');
    }
    else if (!info.exports['./']) {
      throw `No matching Export Map entry for ${exp}.`;
    }
  }
  else if (path) {
    if (!path.match(/\.([mc]js|[tj]sx?)$/g)) path += '.js';
  }
  else if (!path && (sloppyPath = info.module || info['jsnext:main'] || info.browser || info.main)) {
    path = sloppyPath;
    if (!path.match(/\.([mc]js|[tj]sx?)$/g)) path += '.js';
  }
  else if (!path) {
    console.log('falling back to ?module lookup for ', id);
    path += '?module';
  }

  return name + (path ? `/${path}` : '');
}


const unpkg = withCache(FILE_CACHE, async (id) => {
  // const path = await unpkgResolve(id);
  // const res = await fetch(`https://unpkg.com/${name}/${path}`);
  const res = await fetch(`https://unpkg.com/${id}`);
  if (!res.ok) throw `Module ${id} not found.`;
  return await res.text();
});
