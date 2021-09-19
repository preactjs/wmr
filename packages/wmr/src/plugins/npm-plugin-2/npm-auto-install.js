import fs from 'fs';
import https from 'https';
import fetch from 'node-fetch';
import path from 'path';
import tar from 'tar-stream';
import zlib from 'zlib';
import { writeFile } from '../../lib/fs-utils.js';
import { debug } from '../../lib/output-utils.js';
import { friendlyNetworkError, streamToString } from '../npm-plugin/utils.js';
import { Deferred, escapeFilename, getPackageInfo, isValidPackageName } from './utils.js';

const log = debug('npm-auto-install');

/**
 * Fetch package from npm registry
 * @param {string} url
 */
async function fetchNpmPkgInfo(url) {
	try {
		return fetch(url, {
			headers: {
				accept: 'application/vnd.npm.install-v1+json'
			}
		}).then(r => r.json());
	} catch (err) {
		if (err.code === 'ENOTFOUND') {
		}
		throw friendlyNetworkError(err, `npm registry lookup failed for "${url}"`);
	}
}

/**
 * Stream a file to disk
 * @param {string} url
 * @param {string} filePath
 * @returns
 */
async function streamToDisk(url, filePath) {
	await fs.promises.mkdir(path.dirname(filePath), { recursive: true });

	return new Promise((resolve, reject) => {
		const file = fs.createWriteStream(filePath);
		file.on('finish', () => {
			file.close();
			resolve(null);
		});

		https
			.get(url, res => res.pipe(file))
			.on('error', err => {
				// Delete file if there was an error
				fs.unlink(filePath, () => null);
				reject(err);
			});
	});
}

/**
 * @param {import('stream').Readable} bodyStream
 * @param {(name: string, stream: import('stream').PassThrough) => Promise} onFile
 * @param {{ include?: RegExp, exclude?: RegExp}} options
 */
async function parseTarball(bodyStream, onFile, { include, exclude }) {
	return new Promise((resolve, reject) => {
		const extract = tar.extract();

		extract.on('entry', (header, stream, next) => {
			let { type, name } = header;
			name = name.replace(/^package\//, '');

			if (type !== 'file' || (include && !include.test(name)) || (exclude && exclude.test(name))) {
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

/**
 * Automatically fetch missing npm packages from specified npm
 * registry. Note that this should only ever be enabled for
 * prototyping.
 * @param {object} options
 * @param {string} options.cacheDir
 * @returns {import('rollup').Plugin}
 */
export function npmAutoInstall({ cacheDir }) {
	// TODO: Detect from `.npmrc`
	const registryUrl = 'https://registry.npmjs.org';

	/** Files that should always be ignored when storing packages */
	const FILES_EXCLUDE = /([._-]test\.|__tests?|\/tests?\/|\/node_modules\/|\.d\.ts$)/i;

	const USELESS_PROPERTIES = [
		'jest',
		'eslintConfig',
		'eslintIgnore',
		'prettier',
		'babel',
		'scripts',
		'devDependencies',
		'peerDependencies',
		'files',
		'keywords',
		'husky',
		'lint-staged'
	];

	/** @type {Map<string, import('./utils').Deferred>} */
	const pending = new Map();

	return {
		name: 'npm-auto-install',
		async resolveId(id) {
			if (!isValidPackageName(id)) return;

			const meta = getPackageInfo(id);
			const deferredKey = `${meta.name}@${meta.version || 'latest'}`;

			// Subscribe to existing resolve hook if a request for the
			// same package is already in progress;
			let deferred = pending.get(deferredKey);
			if (deferred) {
				log(`waiting on... ${id}`);
				return deferred.promise.then(r => ({ ...r, id }));
			}

			deferred = new Deferred();
			pending.set(deferredKey, deferred);

			log(`downloading... ${id}`);
			const downloadDir = path.join(cacheDir, '_download');

			try {
				const pkg = await fetchNpmPkgInfo(`${registryUrl}/${meta.name}`);

				let version = meta.version || 'latest';
				// Resolve npm tags to an actual version
				const distTags = pkg['dist-tags'];
				version = distTags[version] || version;

				let info = pkg.versions[version];
				const { tarball } = info.dist;

				// Download tarball to disk
				const safeName = escapeFilename(meta.name);
				const tarPath = path.join(downloadDir, `${safeName}-${version}.tgz`);
				await streamToDisk(tarball, tarPath);

				// TODO: Check tarball integrity?

				// Extract tar file
				log(`extracting... ${tarPath}`);
				const extractPath = path.join(downloadDir, `${safeName}@${version}`);

				await parseTarball(
					fs.createReadStream(tarPath),
					async (name, stream) => {
						// TODO: Support binary formats
						let data = await streamToString(stream);

						if (name.endsWith('package.json')) {
							try {
								const json = JSON.parse(data);
								for (const prop of USELESS_PROPERTIES) {
									if (prop in json) {
										delete json[prop];
									}
								}
								data = JSON.stringify(json, null, 2);
							} catch (err) {
								console.warn(`Invalid package.json`);
							}
						}

						await writeFile(path.join(extractPath, name), data);
					},
					{ exclude: FILES_EXCLUDE }
				);

				// Delete tarball after extraction was successful
				await fs.promises.unlink(tarPath);

				const out = {
					id,
					meta: { wmr: { modDir: extractPath } }
				};

				log(`resolving... ${meta.name}, request: ${id}`);
				deferred.resolve(out);
				return out;
			} catch (err) {
				deferred.reject(err);
				throw err;
			}
		}
	};
}
