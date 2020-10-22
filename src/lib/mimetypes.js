import mime from 'mime/lite.js';

/** @param {string} file */
export function getMimeType(file, charset = true) {
	let type = mime.getType(file);
	if (/\.wasm$/.test(file)) {
		type = 'application/wasm';
	}
	if (charset !== false && type && /(text|xml)/.test(type)) {
		type += `;charset=${charset === true ? 'utf-8' : charset}`;
	}
	return type;
}
