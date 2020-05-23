/**
 * To-Be-Published
 * https://gist.github.com/developit/1cc31d2ce6f3374e2d21941f27788ecc
 */

import zlib from 'zlib';

function getChunkSize(chunk, enc) {
	if (!chunk) return 0;
	if (Buffer.isBuffer(chunk)) return Buffer.byteLength(chunk, enc);
	return chunk.length;
}

const noop = () => {};

const MIMES = /text|javascript|xml/i;

/** @returns {import('polka').Middleware} */
export default function compress({ threshold = 1024, level = -1, brotli = false, gzip = true, mimes = MIMES } = {}) {
	const brotliOpts = (typeof brotli === 'object' && brotli) || {};
	const gzipOpts = (typeof gzip === 'object' && gzip) || {};

	return (req, res, next = noop) => {
		const accept = req.headers['accept-encoding'] + '';
		const encoding = ((brotli && accept.match(/\bbr\b/)) || (gzip && accept.match(/\bgzip\b/)) || [])[0];

		// skip if no response body or no supported encoding:
		if (req.method === 'HEAD' || !encoding) return next();

		/** @type {zlib.Gzip | zlib.BrotliCompress} */
		let compress;
		let pendingHead;
		let started = false;
		let size = 0;

		function start() {
			started = true;
			// @ts-ignore
			size = res.getHeader('Content-Length') | 0 || size;
			if (mimes.test(res.getHeader('Content-Type') + '') && size >= threshold) {
				res.setHeader('Content-Encoding', encoding);
				res.removeHeader('Content-Length');
				if (encoding === 'br') {
					const params = {
						[zlib.constants.BROTLI_PARAM_QUALITY]: level,
						[zlib.constants.BROTLI_PARAM_SIZE_HINT]: size
					};
					compress = zlib.createBrotliCompress({ params: Object.assign(params, brotliOpts) });
				} else {
					compress = zlib.createGzip(Object.assign({ level }, gzipOpts));
				}
				// backpressure
				compress.on('data', chunk => write.call(res, chunk) === false && compress.pause());
				on.call(res, 'drain', () => compress.resume());
				compress.on('end', () => end.call(res));
				// const start = Date.now();
				// compress.on('end', () => console.log(`${encoding};q=${level};dur=${Date.now() - start}`));
			}
			// pendingListeners.forEach(p => on.apply(res, p));
			writeHead.apply(res, pendingHead);
		}

		const { end, write, on, writeHead } = res;

		res.writeHead = function (status, reason, headers) {
			if (typeof reason !== 'string') [headers, reason] = [reason, headers];
			if (headers) for (let i in headers) res.setHeader(i, headers[i]);
			pendingHead = [status];
			return this;
		};
		res.write = function (chunk, enc) {
			size += getChunkSize(chunk, enc);
			if (!started) start();
			if (!compress) return write.call(this, chunk, enc);
			return compress.write(chunk, enc);
		};
		res.end = function (chunk, enc) {
			if (!compress) return end.call(this, chunk, enc);
			size += getChunkSize(chunk, enc);
			return compress.end(chunk, enc);
		};
		/** Not currently used. */
		// let pendingListeners = [];
		// res.on = function (type, listener) {
		// 	if (!pendingListeners) on.call(this, type, listener);
		// 	else if (compress) compress.on(type, listener);
		// 	else pendingListeners.push([type, listener]);
		// 	return this;
		// };

		next();
	};
}
