import { parse } from 'es-module-lexer/dist/lexer.js';

/**
 * @param {string} code Module code
 * @param {string} id Source module specifier
 * @param {object} [options]
 * @param {(specifier: string) => string|null|false} [options.resolveImportMeta] Replace `import.meta.FIELD` with a JS string. Return `false`/`null` preserve.
 * @param {(specifier: string, id?: string) => string|null|false} [options.resolveId] Return a replacement for import specifiers
 * @param {(specifier: string, id?: string) => string|null|false} [options.resolveDynamicImport] `false` preserves, `null` falls back to resolveId()
 */
export async function transformImports(code, id, { resolveImportMeta, resolveId, resolveDynamicImport } = {}) {
	const [imports] = await parse(code, id);
	let out = '';
	let offset = 0;
	for (const item of imports) {
		// Skip items that were already processed by being wrapped in an import - eg `import(import.meta.url)`
		if (item.s < offset) continue;

		out += code.substring(offset, item.s);

		const isImportMeta = item.d === -2;
		const isDynamicImport = item.d > -1;

		if (isDynamicImport) {
			// Bugfix: `import(import.meta.url)` returns an invalid negative end_offset.
			// We detect that here and find the closing paren to estimate the offset.
			if (item.e < 0) {
				item.e = code.indexOf(')', item.s);
			}
			// dynamic import() has no statement_end, so we take the position following the closing paren:
			item.se = code.indexOf(')', item.e) + 1;
		}

		let quote = '';
		let after = code.substring(item.e, item.se);

		let spec = code.substring(item.s, item.e);
		offset = item.se;

		// import.meta
		if (isImportMeta) {
			// Check for *simple* property access immediately following `import.meta`:
			const r = /\s*\.\s*([a-z_$][a-z0-9_$]*)/gi;
			r.lastIndex = offset;
			const match = r.exec(code);
			if (match && match.index === offset) {
				// advance past it and append it to the "specifier":
				offset = r.lastIndex;
				spec += match[0];
				// resolve it:
				const property = match[1];
				spec = (resolveImportMeta && resolveImportMeta(property)) || spec;
			}
			out += spec;
			continue;
		}

		// dynamic import()
		if (isDynamicImport) {
			// TODO: Support renderDynamicImport(): https://rollupjs.org/guide/en/#renderdynamicimport
			// `slice(item.d, item.s)` gives us "import(" to implement this.

			// For dynamic imports, spec is a JavaScript expression.
			// We need to try to convert it to a specifier, or bail if it's not static.
			quote = (spec.match(/^\s*(['"`])/) || [])[1];
			if (!quote) {
				// Warn if we were supposed to pass an AST node to resolveDynamicImport(), which is not implemented.
				if (resolveDynamicImport) {
					console.warn(`Cannot resolve dynamic expression in import(${spec})`);
				}
				out += spec + after;
				continue;
			}
			spec = spec.replace(/^\s*(['"`])(.*)\1\s*$/g, '$2');

			// Falls through to resolveId() if null, preserves spec if false.
			const resolved = resolveDynamicImport && resolveDynamicImport(spec, id);
			if (resolved != null) {
				out += quote + (resolved || spec) + quote + after;
				continue;
			}
		}

		const resolved = resolveId && resolveId(spec, id);
		if (resolved) {
			spec = resolved;
		}
		out += quote + spec + quote + after;
	}

	out += code.substring(offset);

	return out;
}
