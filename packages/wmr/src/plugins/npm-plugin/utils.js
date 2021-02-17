import { get } from 'https';

/**
 * User-friendly registry/network error messages.
 * @param {Error & { code: any }} err
 * @param {string} text
 */
export function friendlyNetworkError(err, text) {
	let help = err.message;
	if (err.code === 'ENOTFOUND') help = `It looks like you're offline.`;
	else if (err.code === 404) help = `Package doesn't exist.`;
	const friendlyErr = Error(`${text}: ${help}`);
	throw Object.assign(friendlyErr, { code: err.code });
}

/**
 * @param {string} url
 * @param {Parameters<get>[1]} [config]
 */
export function getJson(url, config) {
	return getStream(url, config).then(streamToString).then(JSON.parse);
}

/**
 * @param {string} url
 * @param {Parameters<get>[1]} [config]
 * @returns {Promise<import('http').IncomingMessage>}
 */
export function getStream(url, config) {
	return new Promise((resolve, reject) => {
		const req = get(url, config || {}, res => {
			const status = res.statusCode || 0;
			if (status >= 200 && status < 400) {
				return resolve(res);
			}
			const err = Object.assign(Error(`${res.statusMessage}: ${url}`), {
				code: status,
				status,
				res
			});
			reject(err);
		});
		req.on('error', reject);
	});
}

/**
 * @param {import('stream').Readable} stream
 * @returns {Promise<string>}
 */
export function streamToString(stream) {
	return new Promise((resolve, reject) => {
		let buffer = '';
		stream.setEncoding('utf-8');
		stream.on('data', data => {
			if (typeof data !== 'string') data = data.toString('utf-8');
			buffer += data;
		});
		stream.once('end', () => {
			resolve(buffer);
		});
		stream.once('error', reject);
	});
}

/**
 * Simple single-arity memoize
 * @template {(...args: any[]) => any} T
 * @param {T} fn
 * @param {(...args: Parameters<T>) => string} [getCacheKey]
 * @returns {(...args: Parameters<T>) => ReturnType<T>}
 */
export function memo(fn, getCacheKey) {
	const cache = new Map();
	return function (...args) {
		const key = getCacheKey ? getCacheKey(...args) : args[0];
		let out = cache.get(key);
		if (out === undefined) {
			out = fn(...args);
			cache.set(key, out);
		}
		return out;
	};
}
