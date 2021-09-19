import { promises as fs } from 'fs';
import path from 'path';
import { transformCss } from '../../../lib/transform-css.js';

export function hash(str) {
	let hash = 5381,
		i = str.length;
	while (i) hash = (hash * 33) ^ str.charCodeAt(--i);
	return (hash >>> 0).toString(36);
}

/**
 * @param {string} css
 * @param {string} id cwd-relative path to the stylesheet, no leading `./`
 * @param {string[]} [mappings] an array to populate with object property code
 * @param {string} [idAbsolute] absolute filepath to the CSS file
 * @returns {Promise<string>}
 */
export async function modularizeCss(css, id, mappings = [], idAbsolute) {
	// normalize to posix id for consistent hashing
	if (id.match(/^[^/]*\\/)) id = id.split(path.sep).join(path.posix.sep);

	const suffix = '_' + hash(id);

	let currentMappings = new Map();
	const toCompose = new Map();

	let result = transformCss(css, (className, additionalClasses, specifier) => {
		let currentSuffix = suffix;
		// Inline external composed styles (composes: foo from './other.css')
		if (specifier) {
			const relativeImportee = path.posix.join(path.posix.dirname(id), specifier);
			currentSuffix = '_' + hash(relativeImportee);
			const filename = path.posix.join(path.posix.dirname(idAbsolute || id), specifier);
			let entry = toCompose.get(filename);
			if (!entry) {
				entry = { filename, classNames: new Set(), id: relativeImportee, suffix: currentSuffix };
				toCompose.set(filename, entry);
			}
			entry.classNames.add(className);
		}
		const mapped = className + currentSuffix;
		let m = currentMappings.get(className);
		if (!m) {
			m = new Set([mapped]);
			currentMappings.set(className, m);
		}
		// {button:"button_abcde another-composed-class_12345"}
		if (additionalClasses) {
			for (const c of additionalClasses.trim().split(' ')) {
				m.add(c);
			}
		}
		return mapped;
	});

	result += (
		await Promise.all(
			Array.from(toCompose.values()).map(async entry => {
				let css = await fs.readFile(entry.filename, 'utf-8');
				return transformCss(
					css,
					(c, additionalClasses, specifier) => {
						if (specifier || additionalClasses) {
							console.error(`Recursive/nested ICSS "composes:" is not currently supported.`);
						}
						return c + entry.suffix;
					},
					rule => {
						// only include rules that were composed
						for (const c of entry.classNames) {
							if (rule.value.split(/[: ()[\],>&+*]/).indexOf('.' + c)) return true;
						}
					}
				);
			})
		)
	).join('');

	currentMappings.forEach((value, key) => {
		// quote keys only if necessary:
		const q = /^\d|[^a-z0-9_$]/gi.test(key) ? `'` : ``;
		const mapped = Array.from(value).join(' ');
		mappings.push(`${q + key + q}:'${mapped}'`);
	});
	return result;
}
