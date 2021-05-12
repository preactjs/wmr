import path from 'path';
import * as kl from 'kolorist';
import { debug, formatPath } from './output-utils.js';

const logServe = debug('wmr:alias');

/**
 * Potentially resolve an import specifier to an aliased url
 * @param {Record<string, string>} aliases
 * @param {string} spec
 * @returns {string | undefined}
 */
export function matchAlias(aliases, spec) {
	for (let name in aliases) {
		// Only check path-like aliases
		if (!name.endsWith('/*')) continue;

		const value = aliases[name];

		// Trim "*" at the end to get a valid path
		name = name.slice(0, -1);

		if (spec.startsWith(name)) {
			const res = path.posix.resolve('/@alias', name, path.posix.relative(value, spec));
			logServe(`${kl.green(formatPath(res))} <- ${kl.dim(formatPath(spec))} `);
			return res;
		} else if (path.posix.isAbsolute(spec) && spec.startsWith(value)) {
			const res = path.posix.resolve('/@alias', name, path.posix.relative(value, spec));
			logServe(`${kl.green(formatPath(res))} <- ${kl.dim(formatPath(spec))} `);
			return res;
		}
	}
}

/**
 * Resolve an aliased url to an absolute file path, unless it's referring
 * to an npm module.
 * @param {Record<string, string>} aliases
 * @param {string} url
 */
export function resolveAlias(aliases, url) {
	if (url.startsWith('/@alias')) {
		url = url.slice('/@alias'.length);
	}

	let partial = url;
	for (let name in aliases) {
		// Exact alias matches take precedence
		if (url === name) return aliases[name];

		// Only check path-like aliases
		if (!name.endsWith('/*')) continue;

		// Trim "*" at the end to get a valid path
		const value = aliases[name];
		name = name.slice(0, -1);

		if (partial === url && url.startsWith(name)) {
			partial = path.resolve(value, url.split(path.posix.sep).join(path.sep).slice(name.length));
		}
	}

	return partial;
}
