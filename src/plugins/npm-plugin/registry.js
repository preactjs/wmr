import { resolve, dirname } from 'path';
import { promises as fs } from 'fs';
import tar from 'tar-stream';
import zlib from 'zlib';
import semverMaxSatisfying from 'semver/ranges/max-satisfying.js';
import { getJson, getStream, memo, streamToString, friendlyNetworkError } from './utils.js';
import stripPackageJsonProperties from './package-strip-plugin.js';
import sizeWarningPlugin from './size-warning-plugin.js';

// @TODO: this whole module should be instantiable
// FIXME: This file is hard to read and took me a few hours to
// understand what's going on. Split up responsibilities:
//  1. Fetch tarball
//  2. Extract tarball (keep streaming? Is it worth the complexity?)
//  3. Write to disk + fullfill requests
//
// The `whenFile` abstraction is hard to read and is a lot of code.
// I'm betting that we can replace that via a simple Promise + multiple
// listeners.

/**
 * @typedef Meta
 * @type {{ name: string, versions: Record<string, Package>, modified: string, 'dist-tags': Record<string, string> }}
 */

/**
 * @typedef Package
 * @type {{ name: string, version: string, dependencies: [], devDependencies: [], dist: { tarball: string, integrity, shasum, fileCount, unpackedSize } }}
 */

/**
 * @typedef Module
 * @type {{ module: string, version: string, path?: string }}
 */

/**
 * @typedef PackageJson
 * @type {{ dependencies?:Record<string,string>, devDependencies?: Record<string,string>, peerDependencies?: Record<string, string>, resolutions?: Record<string, string> }}
 */

/** Files that should be included when storing packages */
const FILES_INCLUDE = /\.(js|mjs|cjs|json|tsx?|css)$/i;

/** Files that should always be ignored when storing packages */
const FILES_EXCLUDE = /([._-]test\.|__tests?|\/tests?\/|\/node_modules\/)/i;

let NODE_MODULES = './node_modules';

/** @todo this is terrible and should be removed once this module is instantiable */
export function setCwd(cwd) {
	NODE_MODULES = resolve(cwd || '.', './node_modules');
}

/**
 * @typedef Plugin
 * @type {{ name?: string, transform?(contents: string, filename: string): string|void }}
 */

// TODO: The plugins are pretty important, but easy to miss
/** @type {Array<Plugin>} */
const plugins = [stripPackageJsonProperties(), sizeWarningPlugin()];

/** The registry to fetch package metadata & tarballs from */
const API = 'https://registry.npmjs.org';

/** How long to cache npm dist-tag version lookups before requerying the registry */
const DIST_TAG_TTL = 60000;

// FIXME: State variable bound to module instantiation, harder to test
/** @type {Map<string, { time: number, version: string }>} */
const DIST_TAG_CACHE = new Map();

async function readPackageJson(filename) {
	try {
		return JSON.parse(await fs.readFile(filename, 'utf-8'));
	} catch (e) {}
}

// FIXME: Stateful variable bound to module instantiation
/** @type {PackageJson} */
let appPackageJson;

// FIXME: Inline
/** @param {PackageJson} pkg */
export function getPackageVersionFromDeps(pkg, name) {
	return (
		(pkg.dependencies && pkg.dependencies[name]) ||
		(pkg.devDependencies && pkg.devDependencies[name]) ||
		(pkg.peerDependencies && pkg.peerDependencies[name])
	);
}

// FIXME: Inline
function getPackageVersionFromResolutions(pkg, name) {
	if (pkg.resolutions) {
		for (const pattern in pkg.resolutions) {
			const escaped = pattern
				.replace(/([.\\^$[]{}()?!])/g, '$1')
				.replace(/\*\*/g, '.+')
				.replace(/\*/g, '[^/]+');
			const reg = new RegExp('^' + escaped + '$', 'gi');
			if (reg.test(name)) {
				// console.log(`using resolution: ${pattern} (${escaped})`);
				return pkg.resolutions[pattern];
			}
		}
	}
}

/**
 * Resolve a (possible) dist-tag version
 * @template {Module} T
 * @param {T} info
 */
export async function resolvePackageVersion(info) {
	// use the locally installed/cached version if available
	const key = info.module + '@' + info.version;
	const cached = DIST_TAG_CACHE.get(key);
	if (cached) {
		if (Date.now() - cached.time <= DIST_TAG_TTL) {
			info.version = cached.version;
			return info;
		}
	}

	// If not specified, use any version constraints from the project's package.json:
	if (!info.version) {
		if (!appPackageJson) {
			// FIXME: Assumption about folder structure
			appPackageJson = (await readPackageJson(resolve(NODE_MODULES, '..', 'package.json'))) || {};
		}
		const resolvedVersion =
			getPackageVersionFromDeps(appPackageJson, info.module) ||
			getPackageVersionFromResolutions(appPackageJson, info.module);
		info.version = resolvedVersion || 'latest';
	}

	// FIXME: Assumption about folder structure
	const pkg = await readPackageJson(resolve(NODE_MODULES, info.module, 'package.json'));
	if (pkg) {
		DIST_TAG_CACHE.set(key, { time: Date.now(), version: pkg.version });
		info.version = pkg.version;
		return info;
	}

	const r = await manuallyResolvePackageVersion(info);
	DIST_TAG_CACHE.set(key, { time: Date.now(), version: r.version });
	return r;
}

/**
 * Resolve a dist-tag version by fetching fresh metadata from the registry
 * @template {Module} T
 * @param {T} info
 */
async function manuallyResolvePackageVersion(info) {
	const { module, version } = info;
	const meta = await getPackageMeta(module);
	const exactVersion = resolveVersion(meta, version);
	if (!exactVersion) {
		throw Error(`Unknown package version: ${module}@${version}`);
	}
	info.version = exactVersion;
	return info;
}

/**
 * Get the highest matching semver version for a package
 * @param {Meta} meta
 * @param {string} version
 */
function resolveVersion(meta, version) {
	const distTags = meta['dist-tags'];
	// Q: Why use `hasOwnProperty()` checks here?
	if (distTags.hasOwnProperty(version)) {
		return distTags[version];
	}

	if (meta.versions.hasOwnProperty(version)) {
		return version;
	}

	const versions = Object.keys(meta.versions);
	return semverMaxSatisfying(versions, version);
}

// "corgi" requests
const SLIM_REQ = {
	headers: {
		accept: 'application/vnd.npm.install-v1+json'
	}
};

// FIXME: memo masks side effect, hard to test
/**
 * Fetch the npm metadata for a module
 * @returns {Promise<Meta>}
 */
const getPackageMeta = memo(async module => {
	try {
		return await getJson(`${API}/${module}`, SLIM_REQ);
	} catch (e) {
		throw friendlyNetworkError(e, `npm registry lookup failed for "${module}"`);
	}
});

// TODO: Choose a different name, easy to mistake for `loadPackageFile`
/**
 * Get a map of files from an npm package
 * @param {Module} info
 */
export async function loadPackageFiles({ module, version }) {
	const meta = await getPackageMeta(module);
	const exactVersion = resolveVersion(meta, version);
	if (!exactVersion) {
		throw Error(`Unknown package version: ${module}@${version}`);
	}

	const info = meta.versions[exactVersion];
	return await getTarFiles(info.dist.tarball, module, version);
}

// FIXME: Stateful variable bound to module instantiation, harder to test
/** @type {Map<string, Map<string, string>>} */
const DISK_CACHE = new Map();

/**
 * Read a single file from an npm package
 * @param {Module} info
 */
export async function loadPackageFile({ module, version, path = '' }) {
	// Q: Why do we need to strip the leading dot/slash?
	path = path.replace(/^\.?\//g, '');

	// console.log('loadPackageFile: ', module, version, path);
	// first, check if this file is sitting in the in-memory cache:
	const files = tarFiles.get(module + '/' + version);
	if (files) {
		const inMemory = files.get(path);
		// console.log(`${path} using in-memory strategy ${inMemory ? 'HIT' : 'MISS'}`);
		if (inMemory) return inMemory;
		return whenFile({ module, version, path });
	}

	// otherwise, check if it's available in node_modules:
	// FIXME: Assumption about folder structure
	const localPath = resolve(NODE_MODULES, module, path);
	// console.log(`${path} using disk strategy ${localPath}`);
	try {
		// FIXME: Remove nested maps by using `module@version:file` as the key
		let diskFiles = DISK_CACHE.get(module + '/' + version);
		if (!diskFiles) {
			diskFiles = new Map();
			DISK_CACHE.set(module + '/' + version, diskFiles);
		}
		// console.log(`  > ${diskFiles.has(path) ? 'in DISK_CACHE' : 'not in DISK_CACHE'}`);
		const diskCached = diskFiles.get(path);
		if (diskCached != null) {
			return diskCached;
		}

		const contents = await fs.readFile(localPath, 'utf-8');
		// console.log(`${path}: read ${contents.length}b from disk`);
		diskFiles.set(path, contents);
		return contents;
	} catch (e) {
		// FIXME: Assumption about folder structure
		const packageExists = await fs.stat(resolve(NODE_MODULES, module)).catch(() => null);
		// console.log(
		// 	`${path} not found, there is ${packageExists ? 'a' : 'no'} package at ${resolve(NODE_MODULES, module)}:\n${
		// 		e.message
		// 	}`
		// );
		if (packageExists) {
			// the package has been streamed to disk, but it doesn't contain this file.
			throw Error(`File not found ${e.message}`);
		}
	}

	// console.log(`${module}/${path} using tar stream strategy`);
	// trigger package fetch, and resolve as soon as the file passes through the tar stream:
	loadPackageFiles({ module, version });
	// FIXME: Cleanup whenFile
	return whenFile({ module, version, path });

	// OLD: get all files, then return the requested one
	// const files = await loadPackageFiles({ module, version });
	// if (!files.has(path)) {
	// 	throw Error(`Package ${module} does not contain file ${path}`);
	// }
	// return files.get(path);
}

// FIXME: Module state
/** @type {Map<string, Map<string, string>>} */
const tarFiles = new Map();

// FIXME: Module state
/** @type {Map<string, Set<{path:string,resolve(d),reject(e?)}>>} */
const whenFiles = new Map();

// FIXME: Replace with Promise, which can have multiple "listeners".
// No need for a separate data structure.
/**
 * Get a promise that resolves once a package file as early as possible
 * @param {Module} info
 * @returns {Promise<string>}
 */
function whenFile({ module, version, path = '' }) {
	// const f = module + '@' + version + ' :: ' + path;
	const packageSpecifier = module + '/' + version;
	let files = tarFiles.get(packageSpecifier);
	let whens = whenFiles.get(packageSpecifier);
	if (files) {
		const cached = files.get(path);
		if (cached != null) {
			// console.log(`when(${f}): already available`);
			return Promise.resolve(cached);
		}
		// we already have a completed files listing and this file wasn't in it.
		if (!whens) {
			// console.log(`when(${f}): confirmed missing`);
			return Promise.reject('no such file');
		}
	}
	// console.log(`when(${f}): pending (${files ? 'has' : 'no'} files, ${whens ? 'has' : 'no'} whens)`);
	// whenFile() should never be called prior to getTarFiles() to avoid races.
	if (!whens) {
		whens = new Set();
		whenFiles.set(packageSpecifier, whens);
	}
	return new Promise((resolve, reject) => {
		whens.add({ path, resolve, reject });
	});
}

// TODO: memo masks side effect, hard to test
const getTarFiles = memo(async (tarballUrl, packageName, version) => {
	const packageSpecifier = packageName + '/' + version;
	// @TODO: pull from cacache
	// https://github.com/npm/pacote/blob/c8ce18728512b4c64fb0a793b99b638fcc2adc31/lib/util/cache-dir.js#L11
	// const cacheDir = os.homedir()+'/.npm/_cacache'
	// await cacache.get(cacheDir, "sri-hash")

	// the existence of an entry in whenFiles indicates that we have an in-flight request
	let whens = whenFiles.get(packageSpecifier);
	if (!whens) whenFiles.set(packageSpecifier, (whens = new Set()));

	// const start = Date.now();

	// we should never reach here if there's an existing entry in tarFiles
	// if (tarFiles.get(packageSpecifier)) throw Error('this should never happen');
	/** @type {Map<string, string>} */
	const files = new Map();
	tarFiles.set(packageSpecifier, files);

	// console.log('streaming tarball for ' + packageName + '@' + version + ': ' + tarballUrl);
	let tarStream;
	try {
		tarStream = await getStream(tarballUrl);
	} catch (e) {
		throw friendlyNetworkError(e, `npm download failed for "${packageName}"`);
	}

	// console.log('getting files for ' + packageName);
	await parseTarball(tarStream, async (name, stream) => {
		// write the file to node_modules
		// createWriteStream(resolve(NODE_MODULES, packageName, name));

		let data = await streamToString(stream);

		for (const plugin of plugins) {
			if (!plugin.transform) continue;
			// try {
			const out = plugin.transform(data, name);
			if (out) data = out;
			// } catch (e) {}
		}

		// console.log(`file ${name} in package ${packageName}: `);

		// FIXME: Shouldn't we await the call here? Otherwise we may
		// have a race condition here
		writeNpmFile(packageName, name, data);

		files.set(name, data);
		Array.from(whens).forEach(when => {
			if (when.path === name) {
				when.resolve(data);
				whens.delete(when);
			}
		});
	});

	// console.log('got files for ' + packageName, Array.from(whens));

	// reject any remaining pending resolutions
	const remaining = Array.from(whens);
	whenFiles.delete(packageSpecifier);
	remaining.forEach(when => {
		when.reject(Error(`Package ${packageName} does not contain file ${when.path}`));
	});

	// console.log(`Streamed ${packageName} in ${Date.now() - start}ms`);

	return files;
});

/** Asynchronously write a file to node_modules */
export async function writeNpmFile(packageName, filename, data) {
	// FIXME: Assumptions about folder structure
	await fs.mkdir(resolve(NODE_MODULES, packageName, dirname(filename)), { recursive: true });
	// FIXME: Assumptions about folder structure
	await fs.writeFile(resolve(NODE_MODULES, packageName, filename), data);
}

/**
 * @param {import('stream').Readable} bodyStream
 * @param {(name: string, stream: import('stream').PassThrough) => Promise} onFile
 */
function parseTarball(bodyStream, onFile) {
	return new Promise((resolve, reject) => {
		const extract = tar.extract();

		extract.on('entry', (header, stream, next) => {
			let { type, name } = header;
			name = name.replace(/^package\//, '');

			if (type !== 'file' || !FILES_INCLUDE.test(name) || FILES_EXCLUDE.test(name)) {
				stream.resume();
				return next();
			}

			onFile(name, stream).then(next);
		});

		extract.on('finish', resolve);
		extract.on('error', reject);

		bodyStream.pipe(zlib.createGunzip()).pipe(extract);
	});
}
