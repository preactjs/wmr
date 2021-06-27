import { decode, encode } from 'sourcemap-codec';
import * as kl from 'kolorist';
import { debug } from '../output-utils.js';

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

	/** @type {import('sourcemap-codec').SourceMapMappings} */
	let mappings = [];

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

		const lines = decode(map.mappings);
		if (mappings.length === 0) {
			mappings = lines;
		} else {
			// TODO: Nesting all these loops seems pretty inefficient.
			// Investigate a different data structure to hold mappings
			// that is less allocation heavy.

			// Merge mappings
			for (let j = 0; j < lines.length; j++) {
				const line = lines[j];

				for (let s = 0; s < line.length; s++) {
					const segment = line[s];
					if (segment.length !== 4) {
						debug(kl.yellow(`WARNING: Only segments with 4 entries are supported`));
						continue;
					}

					const genCodeColumn = segment[0];
					let sourceFileIndex = segment[1];
					const sourceLine = segment[2];
					const sourceColumn = segment[3];

					// Correct source file index in merged file
					const source = map.sources[sourceFileIndex];
					sourceFileIndex = seenSources.get(source) || 0;
					const oldLine = mappings[sourceLine];
					if (oldLine.length) {
					}

					const prevLine = mappings[j];
					console.log('  tracing', segment, prevLine);

					const traced = null;
					if (!traced) continue;
				}
			}
		}
	}

	/** @type {import("rollup").ExistingRawSourceMap} */
	return {
		version: 3,
		// @ts-ignore
		file,
		mappings: encode(mappings),
		names: Array.from(names),
		sources,
		sourceRoot: undefined,
		// @ts-ignore Rollup types are wrong
		sourcesContent
	};
}
