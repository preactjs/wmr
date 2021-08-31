import { encode, decode } from 'sourcemap-codec';

/**
 * @typedef {{ version: number, file?: string, sourceRoot?: string, sources: string[], sourcesContent: Array<string | null>, names: string[], mappings: string}} SourceMap
 */

/**
 *
 * @param {SourceMap[]} maps
 * @param {import('sourcemap-codec').SourceMapMappings[]} parsedMappings
 * @param {Map<string, { index: number, content: string | null}>} sourcesCache
 * @param {number} source
 * @param {number} line
 * @param {number} column
 * @returns {{ line: number, column: number, source: number }}
 */
function getOriginalPosition(maps, parsedMappings, sourcesCache, source, line, column) {
	let originalLine = line;
	let originalColumn = column;
	let originalSource = source;

	// Traverse maps backwards, but skip last map as that's the
	// one we requested the position from
	for (let i = parsedMappings.length - 1; i >= 0; i--) {
		const map = parsedMappings[i];

		const segments = map[originalLine];
		if (!segments) break;

		// TODO: Binary search
		let lastFound;
		for (let j = 0; j < segments.length; j++) {
			const segment = segments[j];
			if (segment[0] === originalColumn) {
				if (segment.length === 1) {
					break;
				}

				const sourceName = maps[i].sources[segment[1]];
				const mappedName = sourcesCache.get(sourceName);
				if (!mappedName) {
					originalSource = 0;
				} else {
					originalSource = mappedName.index;
				}

				originalLine = segment[2];
				originalColumn = segment[3];
				break;
			} else if (segment[0] < originalColumn) {
				lastFound = segment;
			}
		}

		if (lastFound !== undefined) {
			if (lastFound.length === 1) {
				break;
			}

			const sourceName = maps[i].sources[lastFound[1]];
			const mappedName = sourcesCache.get(sourceName);
			if (!mappedName) {
				originalSource = 0;
			} else {
				originalSource = mappedName.index;
			}

			originalLine = lastFound[2];
			originalColumn = lastFound[3] + (originalColumn - lastFound[3]);
		}
	}

	return {
		line: originalLine,
		column: originalColumn,
		source: originalSource
	};
}

/**
 * Combine an array of sourcemaps into one
 * @param {SourceMap[]} sourceMaps
 * @returns {SourceMap}
 */
export function mergeSourceMaps(sourceMaps) {
	let file;
	let sourceRoot;

	/** @type {import('sourcemap-codec').SourceMapMappings[]} */
	const parsedMappings = [];

	/** @type {Map<string, number>} */
	const names = new Map();

	/** @type {Map<string, { index: number, content: string | null}>} */
	const sourcesCache = new Map();

	for (let i = 0; i < sourceMaps.length; i++) {
		const map = sourceMaps[i];

		if (map.file) {
			file = map.file;
		}

		if (map.sourceRoot) {
			sourceRoot = map.sourceRoot;
		}

		for (let j = 0; j < map.sources.length; j++) {
			const source = map.sources[j];
			if (!sourcesCache.has(source)) {
				sourcesCache.set(source, { index: sourcesCache.size, content: map.sourcesContent[j] || null });
			}
		}

		for (let j = 0; j < map.names.length; j++) {
			const name = map.names[j];
			if (!names.has(name)) {
				names.set(name, names.size - 1);
			}
		}

		// Merge mappings
		parsedMappings.push(decode(map.mappings));
	}

	const sources = [];
	const sourcesContent = [];
	for (const [key, value] of sourcesCache.entries()) {
		sources.push(key);
		sourcesContent.push(value.content);
	}

	/** @type {import('sourcemap-codec').SourceMapMappings} */
	const outMappings = [];
	const lastMap = parsedMappings[parsedMappings.length - 1];

	// Loop over the mappings of the last source map and retrieve
	// original position for each mapping segment
	for (let i = 0; i < lastMap.length; i++) {
		const line = lastMap[i];

		/** @type {import('sourcemap-codec').SourceMapSegment[]} */
		const rewrittenSegments = [];
		for (let j = 0; j < line.length; j++) {
			const segment = line[j];

			if (segment.length === 4) {
				const original = getOriginalPosition(
					sourceMaps,
					parsedMappings,
					sourcesCache,
					segment[1],
					segment[2],
					segment[3]
				);
				rewrittenSegments.push([segment[0], original.source, original.line, original.column]);
			} else if (segment.length === 5) {
				const original = getOriginalPosition(
					sourceMaps,
					parsedMappings,
					sourcesCache,
					segment[1],
					segment[2],
					segment[3]
				);
				rewrittenSegments.push([segment[0], original.source, original.line, original.column, segment[4]]);
			} else {
				rewrittenSegments.push(segment);
			}
		}

		outMappings.push(rewrittenSegments);
	}

	return {
		version: 3,
		file,
		names: Array.from(names.keys()),
		sourceRoot,
		sources,
		sourcesContent,
		mappings: encode(outMappings)
	};
}
