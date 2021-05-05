import path from 'path';
import * as kl from 'kolorist';
import { debug, formatPath } from './output-utils.js';

const logServe = debug('wmr:serve');

/**
 * Potentially resolve an import specifier to an aliased url
 * @param {Record<string, string>} aliases
 * @param {string} spec
 * @returns {string | undefined}
 */
export function matchAlias(aliases, spec) {
	for (const name in aliases) {
		const value = aliases[name];

		// Only check path-like aliases
		if (path.posix.isAbsolute(value)) {
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
}

/**
 * @param {Record<string, string>} aliases
 * @param {string} url
 */
export function resolveAlias(aliases, url) {
	for (const name in aliases) {
		const value = aliases[name];

		if (path.posix.isAbsolute(value) && url.startsWith(name)) {
			return path.resolve(value, url.split(path.posix.sep).join(path.sep).slice(name.length));
		}
	}

	return url;
}
