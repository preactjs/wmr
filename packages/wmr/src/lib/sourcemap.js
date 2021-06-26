import { decode, encode } from 'sourcemap-codec';
import { debug } from './output-utils.js';

const log = debug('sourcemap');

/**
 * Apply new source mappings to an existing source map
 * @param {import("rollup").ExistingRawSourceMap[]} sourceMaps
 * @returns {import("rollup").ExistingRawSourceMap}
 */
export function mergeSourceMaps(sourceMaps) {
	/** @type {Set<string>} */
	const names = new Set();
	/** @type {Map<string, {index: number, content: string | null}>} */
	const sources = new Map();
	/** @type {string | undefined} */
	let file;

	/** @type {Map<string, number>} */
	const currentSources = new Map();

	let mergedMapping = '';

	// TODO: Trace from top to bottom all the way through. There is no need to
	// merge each map individually.
	for (let i = 0; i < sourceMaps.length; i++) {
		const map = sourceMaps[i];
		if (!file && map.file) {
			file = map.file.replace(/^\.\//, '');
		}

		// Nobody seems to use this field
		if (map.names.length) {
			log('WARNING: .name field of source maps is currently not supported');
		}

		console.log('MERGE', map);

		// Copy over original source code and save the index it
		// was found at for later.
		map.sources.forEach((source, j) => {
			if (source === null) {
				log(`WARNING: Sources must be of type string in "sources" array`);
				return;
			}

			source = source.replace(/^\.\//, '');
			currentSources.set(source, j);

			if (!sources.has(source)) {
				sources.set(source, { index: j, content: map.sourcesContent ? map.sourcesContent[j] : null });
			}
		});

		if (!mergedMapping) {
			mergedMapping = map.mappings;
		} else {
			// Merging the actual mappings
			const currentMappings = decode(map.mappings);
			console.log(currentMappings);
		}

		// Reset state for next source map
		currentSources.clear();
	}

	/** @type {Array<string | null> | undefined} */
	let sourcesContent;
	if (sources.size) {
		sourcesContent = [];
		for (const value of sources.values()) {
			sourcesContent.push(value.content);
		}
	}

	/** @type {import("rollup").ExistingRawSourceMap} */
	return {
		version: 3,
		// @ts-ignore
		file,
		mappings: encode(),
		names: Array.from(names),
		sources: Array.from(sources.keys()),
		sourceRoot: undefined,
		// @ts-ignore Rollup types are wrong
		sourcesContent
	};
}
