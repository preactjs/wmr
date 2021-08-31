import path from 'path';
import * as kl from 'kolorist';
import { debug, formatPath } from './output-utils.js';

const logServe = debug('wmr:alias');

/**
 * Potentially resolve an import specifier to an aliased url
 * @param {Record<string, string>} alias
 * @param {string} spec
 * @returns {string | undefined}
 */
export function matchAlias(alias, spec) {
	for (let name in alias) {
		// Only check path-like alias mapping
		if (!name.endsWith('/*')) continue;

		const value = alias[name];

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
 * @param {Record<string, string>} alias
 * @param {string} url
 */
export function resolveAlias(alias, url) {
	if (url.startsWith('/@alias')) {
		url = url.slice('/@alias'.length);
	}

	let partial = url;
	for (let name in alias) {
		// Exact alias matches take precedence
		if (url === name) return alias[name];

		// Only check path-like alias mapping
		if (!name.endsWith('/*')) continue;

		// Trim "*" at the end to get a valid path
		const value = alias[name];
		name = name.slice(0, -1);

		if (partial === url && url.startsWith(name)) {
			partial = path.resolve(value, url.split(path.posix.sep).join(path.sep).slice(name.length));
		}
	}

	return partial;
}
