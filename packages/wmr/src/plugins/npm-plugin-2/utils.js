import * as path from 'path';
import { isDirectory } from '../../lib/fs-utils.js';
import { builtinModules } from 'module';

const builtins = new Set(builtinModules);

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
 * Check if id is a valid npm package name
 * @param {string} id
 * @returns {boolean}
 */
export function isValidPackageName(id) {
	const isValid =
		// Must not start with `._`
		!/^[._/]/.test(id) &&
		// Must not match deny list
		!/node_modules|favicon\.ico/.test(id) &&
		// Must not be a built-in node module
		!builtins.has(id) &&
		// Must be lowercase
		id.toLowerCase() === id &&
		// Must not contain special characters
		!/[~'!()*;,?:&=+$]/.test(id) &&
		// Must contain a second path segment if scoped
		((id[0] === '@' && id.indexOf('/') > 0) || true);

	return isValid;
}

/**
 * Extract package meta information from id.
 *
 *   foo
 *     -> { name: 'foo', version: '', pathname: '' }
 *   foo/bar.css
 *     -> { name: 'foo', version: '', pathname: 'bar.css' }
 *   foo@1.2.3-rc.1/bar.css
 *     -> { name: 'foo', version: '1.2.3-rc.1', pathname: 'bar.css' }
 *   @foo/bar.css
 *     -> { name: '@foo/bar.css', version: '', pathname: '' }
 *   @foo/bar/bob.css
 *     -> { name: '@foo/bar', version: '', pathname: 'bob.css' }
 *   @foo/bar@1.2.3/bob.css
 *     -> { name: '@foo/bar', version: '1.2.3', pathname: 'bob.css' }
 * @param {string} id
 * @returns {{ name: string, version: string, pathname: string }}
 */
export function getPackageInfo(id) {
	const match = id.match(/^(@[^/]+\/[^/@]+|[^@][^/@]+)(?:@([^/]+))?(?:\/(.*))?$/);

	if (!match) {
		throw new Error(`Unable to extract package meta information from "${id}"`);
	}

	const [, name, version = '', pathname = ''] = match;
	return { name, version, pathname };
}

/**
 * Find directory to installed package. We'll
 * essentially traverse upwards and search for
 * `node_modules`.
 * @param {string} root
 * @param {string} name
 */
export async function findInstalledPackage(root, name) {
	// There may be multiple `node_modules` directories at play
	// with monorepo setups.
	try {
		let dir = root;

		let lastDir = root;
		// eslint-disable-next-line no-constant-condition
		while (true) {
			const maybe = path.join(dir, 'node_modules', name);
			if (await isDirectory(maybe)) {
				return maybe;
			}

			lastDir = dir;
			dir = path.dirname(dir);
			if (lastDir === dir) {
				return;
			}
		}
	} catch (err) {
		return;
	}
}

function resolveExportsValue(obj) {
	const order = ['import', 'node', 'require', 'default'];

	for (let i = 0; i < order.length; i++) {
		const key = order[i];
		if (key in obj) return obj[key];
	}
}

/**
 * Resolve "exports" field in `package.json`.
 * @param {Record<string, any>} pkg Package JSON
 * @param {string} pathname
 * @returns {string | undefined}
 */
export function resolvePackageExport(pkg, pathname) {
	// Main entry
	if (!pathname) {
		if (typeof pkg.exports === 'string') {
			return pkg.exports;
		}

		if ('.' in pkg.exports) {
			const info = pkg.exports['.'];
			if (typeof info === 'string') {
				return info;
			}

			return resolveExportsValue(info);
		}

		return resolveExportsValue(pkg.exports);
	}

	// Non-main entry
	const maybeEntry = pkg.exports['./' + pathname];
	if (maybeEntry) {
		if (typeof maybeEntry === 'string') {
			return maybeEntry;
		}

		return resolveExportsValue(maybeEntry);
	}
}

/**
 * Escape special characters of npm names for filename
 * @param {string} str
 * @returns {string}
 */
export function escapeFilename(str) {
	return str.replace('/', '__');
}

export class Deferred {
	constructor() {
		this.promise = new Promise((resolve, reject) => {
			this.resolve = resolve;
			this.reject = reject;
		});
	}
}
