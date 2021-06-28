import * as kl from 'kolorist';
import { debug } from '../output-utils.js';
import { decodeMappings, encodeMappings } from './vlq.js';

const log = debug('sourcemap');

/**
 * Apply new source mappings to an existing source map
 * @param {import("rollup").ExistingRawSourceMap[]} sourceMaps
 * @returns {import("rollup").ExistingRawSourceMap}
 */
export function mergeAllSourceMaps(sourceMaps) {
	/** @type {Set<string>} */
	const names = new Set();
	/** @type {Map<string, number>} */
	const seenSources = new Map();
	/** @type {string[]} */
	const sources = [];
	/** @type {Array<string | null>} */
	const sourcesContent = [];

	/** @type {string | undefined} */
	let file;

	/** @type {number[]} */
	let mappings = [];

	for (let i = 0; i < sourceMaps.length; i++) {
		const map = sourceMaps[i];
		if (!file && map.file) {
			file = map.file;
		}

		// Nobody seems to use this field
		if (map.names.length) {
			log('WARNING: .name field of source maps is currently not supported');
		}

		console.log('MERGE', JSON.stringify(map));

		// Copy over original source code and save the index it
		// was found at for later.
		map.sources.forEach((source, j) => {
			if (source === null) {
				log(kl.yellow(`WARNING: Sources must be of type string in "sources" array`));
				return;
			}

			source = source.replace(/^\.\//, '');

			if (!seenSources.has(source)) {
				const idx = sources.push(source) - 1;
				seenSources.set(source, idx);

				/** @type {string | null} */
				let content = null;
				if (map.sourcesContent && map.sourcesContent[j]) {
					content = map.sourcesContent[j];
				}
				sourcesContent.push(content);
			}
		});

		const parsedMappings = decodeMappings(map.mappings, map.sources.length);

		if (i === 0) {
			mappings = parsedMappings;
		} else {
			// Merge and rewrite sources
		}
	}

	/** @type {import("rollup").ExistingRawSourceMap} */
	return {
		version: 3,
		// @ts-ignore
		file,
		mappings: encodeMappings(mappings),
		names: Array.from(names),
		sources,
		sourceRoot: undefined,
		// @ts-ignore Rollup types are wrong
		sourcesContent
	};
}
