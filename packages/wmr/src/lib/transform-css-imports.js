/**
 * @param {string} code Module code
 * @param {string} id Source module specifier
 * @param {object} options
 * @param {import("./transform-imports").ResolveFn} options.resolveId Return a replacement for import specifiers
 */
export async function transformCssImports(code, id, { resolveId }) {
	const CSS_IMPORTS = /(?:@import\s+['"](.*?)['"];|url\(["']?(.*?)["']?\))/g;

	let out = code;
	let offset = 0;

	let match;
	while ((match = CSS_IMPORTS.exec(code))) {
		const spec = match[1] || match[2];
		const start = match.index + match[0].indexOf(spec) + offset;
		const end = start + spec.length;

		const resolved = await resolveId(spec, id);
		if (typeof resolved === 'string') {
			out = out.slice(0, start) + resolved + out.slice(end);
			offset += resolved.length - spec.length;
		}
	}

	return out;
}
