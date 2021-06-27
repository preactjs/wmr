// Use a lookup table to accelerate VLQ decoding
const vlqTable = new Array(128).fill(255);
const vlqChars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
for (let i = 0; i < vlqChars.length; i++) {
	vlqTable[vlqChars.charCodeAt(i)] = i;
}

/**
 * Decode 32 bit numbers to VLQ.
 *
 * The format encodes numbers into blocks of 6bits. The first bit
 * (=32) is always reserverd for the "continuation bit". It signals
 * that we need to continue parsing the next block if the number
 * didn't fit into the ones we parsed up to now.
 *
 * In the first block the bit at the end is reserved for the sign
 * of the integer.
 *
 *  Continuation
 *   |    Sign
 *   |    |
 *   V    V
 *   101011
 *
 * More info: https://en.wikipedia.org/wiki/Variable-length_quantity
 * Note: Numbers are limited to 32 bit.
 *
 * FYI: This function is called very requently for source maps.
 *
 * Adapted from: https://github.com/evanw/esbuild/blob/8a602b8ca3faaa02e5eaa1110741452a81795554/internal/sourcemap/sourcemap.go#L116-L144
 *
 * @param {string} input
 * @param {{i: number}} result The new index position
 * @returns {number}
 */
export function decodeVLQ(input, result) {
	let shift = 0;
	let value = 0;

	// eslint-disable-next-line no-constant-condition
	while (true) {
		if (result.i >= input.length) {
			throw new Error('Unexpected end of mappings');
		}

		const char = input.charCodeAt(result.i);
		// Check if char is < 128 to avoid out of bounds access in our
		// vlqTable array.
		if ((char & 127) !== char) {
			throw new Error('Invalid character in mappings');
		}

		// Index in vlqChars string
		const idx = vlqTable[char];

		// The character is invalid if the value is the default 255
		// value in the vlqTable
		if (idx === 255) {
			throw new Error('Invalid character in mappings');
		}

		// Alright, we're dealing with a valid character and can continue.
		result.i++;

		// Remove the continuation bit and shift value on top
		value |= (idx & 31) << shift;

		// Shift by the number of parsed bits in a block (5 bits + 1 bit
		// for the continuation sign).
		shift += 5;

		// Check for continuation bit (=32) in the current block. It signals
		// if we need to continue parsing the next block. This happens when
		// the number doesn't fit into the previous blocks we parsed up
		// until here.
		if ((idx & 32) === 0) break;
	}

	// Recover the sign value which is the always the bit at the end
	// of the last block. The easiest way is to just shift the whole
	// number to the right.
	return value & 1 ? -(value >> 1) : value >> 1;
}

/**
 * Decode mappings from a source map
 * @param {string} mappings
 * @param {number} sourcesCount
 * @returns {number[]} decoded mappings
 */
export function decodeMappings(mappings, sourcesCount) {
	const len = mappings.length;

	/** @type {number[]} */
	const result = [];

	const state = {
		i: 0
	};

	let line = 0;
	let column = 0;
	let sourceLine = 0;
	let sourceColumn = 0;
	let sourceIdx = 0;

	while (state.i < len) {
		let char = mappings.charCodeAt(state.i);

		switch (char) {
			case 59 /* ; */:
				line++;
				column = 0;
				state.i++;
				continue;

			// Ignore stray commas
			case 44 /* , */:
				state.i++;
				continue;
		}

		column += decodeVLQ(mappings, state);
		if (column < 0) {
			throw new Error(`Invalid column mapping ${column}`);
		}

		let hasSourceReference = false;
		if (state.i < len) {
			char = mappings.charCodeAt(state.i);
			switch (char) {
				case 44 /* , */:
					state.i++;
					break;
				case 59 /* ; */:
					break;
				default: {
					hasSourceReference = true;

					// Read source reference
					sourceIdx += decodeVLQ(mappings, state);
					if (sourceIdx < 0 || sourceIdx > sourcesCount) {
						throw new Error(`Invalid source reference ${sourceIdx}`);
					}

					// Read source line
					sourceLine += decodeVLQ(mappings, state);
					if (sourceLine < 0) {
						throw new Error(`Invalid source line ${sourceLine}`);
					}

					// Read source column
					sourceColumn += decodeVLQ(mappings, state);
					if (sourceColumn < 0) {
						throw new Error(`Invalid source column ${sourceColumn}`);
					}

					// Check for optional name index. Note that nobody seems
					// to use that, so we'll skip it for now
					if (state.i < len) {
						char = mappings.charCodeAt(state.i);
						switch (char) {
							case 44 /* , */:
								state.i++;
								break;
							case 59 /* ; */:
								break;
							default:
								throw new Error(
									'TODO: Parsing source names not supported yet. Please file an issue on the WMR repository.'
								);
						}
					}
				}
			}

			result.push(line, column);

			if (!hasSourceReference) {
				result.push(-1, -1, -1);
			} else {
				result.push(sourceIdx, sourceLine, sourceColumn);
			}

			// TODO: implement name
			result.push(-1);
		}
	}

	return result;
}

/**
 * Encode a number to VLQ. See `decodeVLQ` for more information.
 * @param {number} value
 * @returns {string}
 */
export function encodeVLQ(value) {
	// Set sign bit
	let num = value < 0 ? (-value << 1) | 1 : value << 1;

	let encoded = '';

	// eslint-disable-next-line no-constant-condition
	while (true) {
		// Drop continuation bit for index
		let idx = num & 31;

		// Shift num by 5 bits.
		num >>>= 5;

		// Add continuation bit if the value is larger than
		// the current block
		if (num > 0) {
			idx |= 32;
		}

		encoded += vlqChars[idx];

		if (num === 0) break;
	}

	return encoded;
}
