import { promises as fs } from 'fs';
import zlib from 'zlib';
import terser from 'terser';
import { dirname, resolve } from 'path';

// TODO: this could be indefinite, since cache keys are deterministic (version+path)
const CACHE_TTL = 60 * 60 * 1000; // 1 hour

/**
 * @typedef Mem
 * @type {{ module: string, path: string, version: string, brotli, upgrading: boolean, modified: number, code: string, cwd: string }}
 */

/**
 * @typedef Meta
 * @type {{ module: string, path: string, version: string }}
 */

/** @type {Map<string, Mem>} */
export const BUNDLE_CACHE = new Map();

export const BROTLI_OPTS = {
	//level: 11
	params: {
		[zlib.constants.BROTLI_PARAM_MODE]: zlib.constants.BROTLI_DEFAULT_MODE,
		[zlib.constants.BROTLI_PARAM_QUALITY]: zlib.constants.BROTLI_MAX_QUALITY,
		[zlib.constants.BROTLI_PARAM_SIZE_HINT]: 0
	}
};

/**
 * Create a minified+compressed version of a bundle in the in-memory and disk caches
 * @param {Mem} mem
 * @TODO move this into a Worker
 */
function upgradeToBrotli(mem) {
	return new Promise((resolve, reject) => {
		// console.log(`Upgrading ${mem.module}/${mem.path} to compressed version...`);
		// const start = Date.now();
		mem.upgrading = true;
		const result = terser.minify(mem.code, {
			mangle: {
				// Temporary workaround for duplicate identifier bug in Terser 4/5:
				// https://github.com/terser/terser/issues/800#issuecomment-701017137
				keep_fnames: true
			},
			compress: true,
			module: true,
			ecma: 9,
			safari10: true,
			sourceMap: false
		});
		if (result.warnings) {
			console.warn(result.warnings.join('\n'));
		}
		if (result.error) {
			console.error(result.error);
		} else {
			mem.code = result.code;
		}
		const cacheFile = getCachePath(mem, mem.cwd);
		fs.writeFile(cacheFile, result.code);
		zlib.brotliCompress(mem.code, BROTLI_OPTS, (err, data) => {
			mem.upgrading = false;
			if (err && result.error) {
				return reject(Error(`Minification and Brotli compression failed for ${mem.module}/${mem.path}.`));
			}
			mem.brotli = data;
			fs.writeFile(cacheFile + '.br', data);
			// console.log(`  > ${mem.module}/${mem.path} upgraded in ${Date.now() - start}ms`);
			resolve();
		});
	});
}

const compressionQueue = new Set();
export function enqueueCompress(cacheKey) {
	compressionQueue.add(cacheKey);
	if (compressionQueue.size === 1) {
		setTimeout(compressBackground, 1000);
	}
}
function compressBackground() {
	const cacheKey = compressionQueue.values().next().value;
	if (!cacheKey) return;
	const entry = BUNDLE_CACHE.get(cacheKey);
	upgradeToBrotli(entry).then(() => {
		setTimeout(() => {
			compressionQueue.delete(cacheKey);
			compressBackground();
		}, 1000);
	});
}

/**
 * Get cached code for a bundle from the in-memory or disk caches
 * @param {string} etag the ETag is also used as the in-memory cache key
 * @param {Meta} meta
 * @param {string} [cwd]
 */
export async function getCachedBundle(etag, { module, path, version }, cwd) {
	if (BUNDLE_CACHE.has(etag)) {
		const mem = BUNDLE_CACHE.get(etag);
		if (Date.now() - mem.modified > CACHE_TTL) return;
		return {
			code: mem.code,
			brotli: mem.brotli,
			cacheStatus: 'MEMORY'
		};
	}
	const cacheFile = getCachePath({ module, path, version }, cwd);
	const stat = await fs.stat(cacheFile).catch(() => null);
	if (!stat || Date.now() - stat.mtimeMs > CACHE_TTL) return;
	// cached = await fs.readFile(cacheFile, 'utf-8');
	const [code, brotli] = await Promise.all([
		fs.readFile(cacheFile, 'utf-8'),
		fs.readFile(cacheFile + '.br').catch(() => null)
	]);
	// ressurect the in-memory cache entry from disk:
	BUNDLE_CACHE.set(etag, {
		module,
		path,
		version,
		brotli,
		upgrading: false,
		modified: stat.mtimeMs,
		code,
		cwd
	});
	return {
		code,
		brotli,
		cacheStatus: 'DISK'
	};
}

/**
 * Store a generated bundle in the in-memory and disk caches
 * @param {string} etag the ETag is also used as the in-memory cache key
 * @param {string} code the generated bundle code
 * @param {Meta} meta
 * @param {string} [cwd]
 */
export function setCachedBundle(etag, code, { module, path, version }, cwd) {
	BUNDLE_CACHE.set(etag, {
		module,
		path,
		version,
		brotli: null,
		upgrading: false,
		modified: Date.now(),
		code,
		cwd
	});
	const cacheFile = getCachePath({ module, path, version }, cwd);
	fwrite(cacheFile, code);
}

/**
 * @param {import('http').IncomingMessage} req
 * @param {import('http').ServerResponse} res
 */
export function sendCachedBundle(req, res, { code, brotli, cacheStatus }) {
	const headers = {
		'content-length': Buffer.byteLength(code),
		'x-cache-status': cacheStatus
	};
	if (brotli && /\bbr\b/.test(req.headers['accept-encoding'] + '')) {
		headers['content-encoding'] = 'br';
		headers['content-length'] = brotli.byteLength;
		const etag = res.getHeader('etag');
		if (etag) {
			headers.etag = etag + '-br';
		}
	} else {
		// this UA doesn't support brotli
		brotli = null;
	}
	res.writeHead(200, headers);
	res.end(brotli || code);
}

// @TODO: this is basically writeNpmFile from registry.js
async function fwrite(filename, data) {
	await fs.mkdir(dirname(filename), { recursive: true });
	await fs.writeFile(filename, data);
}

/**
 * Generate a human-readable cache path
 * @param {Meta} meta
 * @param {string} [cwd = '.']
 */
function getCachePath({ module, version, path }, cwd) {
	const tfPath = (path || '').replace(/\//g, '---');
	return resolve(cwd || '.', `.cache/@npm/${module}@${version}/${tfPath}.js`);
}
