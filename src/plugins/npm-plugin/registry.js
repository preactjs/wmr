import { resolve, dirname } from 'path';
import { promises as fs } from 'fs';
// import fetch from 'node-fetch';
import tar from 'tar-stream';
import gunzip from 'gunzip-maybe';
import semverMaxSatisfying from 'semver/ranges/max-satisfying.js';
import { getJson, getStream, memo, streamToString } from './utils.js';
import stripPackageJsonProperties from './package-strip-plugin.js';
import sizeWarningPlugin from './size-warning-plugin.js';

// @TODO: this whole module should be instantiable

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

/** Files that should be included when storing packages */
const FILES_INCLUDE = /\.(js|mjs|cjs|json|ts)$/i;

/** Files that should always be ignored when storing packages */
const FILES_EXCLUDE = /([._-]test\.|__tests?|\/tests?\/|\/node_modules\/)/i;

let NODE_MODULES = './node_modules';

/** @todo this is terrible and should be removed once this module is instantiable */
export function setCwd(cwd) {
	NODE_MODULES = resolve(cwd, './node_modules');
}

/**
 * @typedef Plugin
 * @type {{ name?: string, transform?(contents: string, filename: string): string|void }}
 */

/** @type {Array<Plugin>} */
const plugins = [stripPackageJsonProperties(), sizeWarningPlugin()];

/** The registry to fetch package metadata & tarballs from */
const API = 'https://registry.npmjs.org';

/** How long to cache npm dist-tag version lookups before requerying the registry */
const DIST_TAG_TTL = 60000;

/** @type {Map<string, { time: number, version: string }>} */
const DIST_TAG_CACHE = new Map();

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

	try {
		const pkg = JSON.parse(await fs.readFile(resolve(NODE_MODULES, info.module, 'package.json'), 'utf-8'));
		DIST_TAG_CACHE.set(key, { time: Date.now(), version: pkg.version });
		info.version = pkg.version;
		return info;
	} catch (e) {}

	const r = await manuallyResolvePackageVersion(info);
	DIST_TAG_CACHE.set(key, { time: Date.now(), version: info.version });
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

/**
 * Fetch the npm metadata for a module
 * @returns {Promise<Meta>}
 */
const getPackageMeta = memo(module => {
	return getJson(`${API}/${module}`, SLIM_REQ);
});

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

/** @type {Map<string, Map<string, string>>} */
const DISK_CACHE = new Map();

/**
 * Read a single file from an npm package
 * @param {Module} info
 */
export async function loadPackageFile({ module, version, path = '' }) {
	// first, check if this file is sitting in the in-memory cache:
	const files = tarFiles.get(module + '/' + version);
	if (files) {
		const inMemory = files.get(path);
		// console.log(`${path} using in-memory strategy ${inMemory ? 'HIT' : 'MISS'}`);
		if (inMemory) return inMemory;
		return whenFile({ module, version, path });
	}

	// otherwise, check if it's available in node_modules:
	const localPath = resolve(NODE_MODULES, module, path);
	// console.log(`${path} using disk strategy ${localPath}`);
	try {
		let diskFiles = DISK_CACHE.get(module + '/' + version);
		if (!diskFiles) {
			diskFiles = new Map();
			DISK_CACHE.set(module + '/' + version, diskFiles);
		}
		if (diskFiles.has(path)) return diskFiles.get(path);

		const contents = await fs.readFile(localPath, 'utf-8');
		// console.log(`${path}: read ${contents.length}b from disk`);
		diskFiles.set(path, contents);
		return contents;
	} catch (e) {
		const packageExists = await fs.stat(resolve(NODE_MODULES, module)).catch(() => null);
		// console.log(
		// 	`${path} not found, there is ${packageExists ? 'a' : 'no'} package at ${resolve(NODE_MODULES, module)}:\n${
		// 		e.message
		// 	}`
		// );
		if (packageExists) {
			// the package has been streamed to disk, but it doesn't contain this file.
			throw Error(`File not found`);
		}
	}

	// console.log(`${module}/${path} using tar stream strategy`);
	// trigger package fetch, and resolve as soon as the file passes through the tar stream:
	loadPackageFiles({ module, version });
	return whenFile({ module, version, path });

	// OLD: get all files, then return the requested one
	// const files = await loadPackageFiles({ module, version });
	// if (!files.has(path)) {
	// 	throw Error(`Package ${module} does not contain file ${path}`);
	// }
	// return files.get(path);
}

/** @type {Map<string, Map<string, string>>} */
const tarFiles = new Map();

/** @type {Map<string, Set<{path:string,resolve(d),reject(e?)}>>} */
const whenFiles = new Map();

/**
 * Get a promise that resolves once a package file as early as possible
 * @param {Module} info
 * @returns {Promise<string>}
 */
function whenFile({ module, version, path }) {
	// const f = module + '@' + version + ' :: ' + path;
	const packageSpecifier = module + '/' + version;
	let files = tarFiles.get(packageSpecifier);
	let whens = whenFiles.get(packageSpecifier);
	if (files) {
		if (files.has(path)) {
			// console.log(`when(${f}): already available`);
			return Promise.resolve(files.get(path));
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
	const tarStream = await getStream(tarballUrl);

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
	await fs.mkdir(resolve(NODE_MODULES, packageName, dirname(filename)), { recursive: true });
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

		bodyStream.pipe(gunzip()).pipe(extract);
	});
}
