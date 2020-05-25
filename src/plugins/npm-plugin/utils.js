import { get } from 'https';

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
		get(url, config || {}, res => {
			const status = res.statusCode;
			if (status < 200 || status >= 400) reject(Error(res.statusMessage));
			else resolve(res);
		});
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
		stream.on('end', () => {
			resolve(buffer);
		});
		stream.on('error', reject);
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
