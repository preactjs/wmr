/**
 * Trace source map locations
 * @param {number[]} mappings
 * @param {number} line
 * @param {number} column
 * @param {{ line: number, column: number }} result
 */
export function traceSourceLocation(mappings, line, column, result) {
	let lastSourceLine = -1;
	let lastMappedColumn = -1;

	for (let i = 0; i < mappings.length; i += 6) {
		const mappedLine = mappings[i + 0];
		const mappedColumn = mappings[i + 1];
		const sourceLine = mappings[i + 3];
		const sourceColumn = mappings[i + 4];

		if (mappedLine === line) {
			line = sourceLine;
			if (mappedColumn > column) {
				const delta = column - lastMappedColumn;
				column = sourceColumn + delta;
				break;
			} else if (mappedColumn === column) {
				column = sourceColumn;
				break;
			} else if (mappedColumn < column) {
				lastMappedColumn = mappedColumn;
			}
		} else if (mappedLine > line) {
			break;
		}
	}

	result.line = line;
	result.column = column;
}
