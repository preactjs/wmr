import { parse } from 'es-module-lexer';
import MagicString from 'magic-string';
import path from 'path';

/** @template T @typedef {Promise<T>|T} MaybePromise */

/** @typedef {(specifier: string, id?: string) => MaybePromise<string|false|null|void>} ResolveFn */

const KIND_IMPORT = 0;
const KIND_DYNAMIC_IMPORT = 1;
const KIND_IMPORT_META = 2;

/**
 * @param {string} code Module code
 * @param {string} id Source module specifier
 * @param {object} options
 * @param {ResolveFn?} [options.resolveImportMeta] Replace `import.meta.FIELD` with a JS string. Return `false`/`null` preserve.
 * @param {ResolveFn?} [options.resolveId] Return a replacement for import specifiers
 * @param {ResolveFn?} [options.resolveDynamicImport] `false` preserves, `null` falls back to resolveId()
 * @param {boolean} [options.sourcemap]
 * @returns {Promise<{ code: string, map: any }>}
 */
export async function transformImports(code, id, { resolveImportMeta, resolveId, resolveDynamicImport, sourcemap }) {
	const [imports] = await parse(code, id);
	const s = new MagicString(code);
	let offset = 0;

	/** @type {Array<{ spec: string, start: number, end: number, kind: number, property: null | string}>} */
	const toResolve = [];

	for (const item of imports) {
		// Skip items that were already processed by being wrapped in an import - eg `import(import.meta.url)`
		if (item.s < offset) continue;

		let isImportMeta = item.d === -2;
		const isDynamicImport = item.d > -1;

		if (isDynamicImport) {
			// Bugfix: `import(import.meta.url)` returns an invalid negative end_offset.
			// We detect that here and find the closing paren to estimate the offset.
			if (item.e < 0) {
				// @ts-ignore
				item.e = code.indexOf(')', item.s);
				isImportMeta = true;
			}
			// dynamic import() has no statement_end, so we take the position following the closing paren:
			// @ts-ignore
			item.se = code.indexOf(')', item.e) + 1;
		}

		let quote = '';

		let spec = code.substring(item.s, item.e);
		offset = item.se;

		// import.meta
		if (isImportMeta) {
			offset = item.s + 'import.meta'.length;
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
				if (resolveImportMeta) {
					toResolve.push({ spec, start: item.s, end: offset, kind: KIND_IMPORT_META, property });
				}
			}
			continue;
		}

		// dynamic import()
		if (isDynamicImport) {
			// TODO: Support renderDynamicImport(): https://rollupjs.org/guide/en/#renderdynamicimport
			// `slice(item.d, item.s)` gives us "import(" to implement this.

			// Strip comments - these are usually Webpack magic comments.
			let originalSpec = spec;
			spec = spec
				.replace(/\/\*[\s\S]*\*\//g, '')
				.replace(/^\s*\/\/.*$/gm, '')
				.trim();

			// Update start position if we stripped leading characters
			if (originalSpec.length !== spec.length) {
				// @ts-ignore
				item.s += originalSpec.indexOf(spec);
			}

			// For dynamic imports, spec is a JavaScript expression.
			// We need to try to convert it to a specifier, or bail if it's not static.
			quote = (spec.match(/^\s*(['"`])/) || [])[1];
			if (!quote) {
				// Warn if we were supposed to pass an AST node to resolveDynamicImport(), which is not implemented.
				if (resolveDynamicImport) {
					console.warn(`Cannot resolve dynamic expression in import(${spec})`);
				}
				continue;
			} else {
				// Trim any import assertions if present so that we just have the
				// import specifier itself.
				const closingQuoteIdx = spec.indexOf(quote, 1);
				spec = spec.slice(0, closingQuoteIdx + 1);
				// @ts-ignore
				item.e = code.indexOf(quote, item.s + 1);
			}

			spec = spec.replace(/^\s*(['"`])(.*)\1\s*$/g, '$2');

			toResolve.push({
				spec,
				// Account for opening quote
				start: item.s + 1,
				end: item.e,
				kind: KIND_DYNAMIC_IMPORT,
				property: null
			});
			continue;
		}

		if (resolveId) {
			toResolve.push({ spec, start: item.s, end: item.e, kind: KIND_IMPORT, property: null });
		}
	}

	await Promise.all(
		toResolve.map(async v => {
			let resolved = null;
			if (v.kind === KIND_IMPORT) {
				// @ts-ignore
				resolved = await resolveId(v.spec, id);
			} else if (v.kind === KIND_DYNAMIC_IMPORT) {
				// @ts-ignore
				if (resolveDynamicImport) {
					resolved = await resolveDynamicImport(v.spec, id);
				}

				if (resolved == null && resolveId) {
					resolved = await resolveId(v.spec, id);
				}
			} else if (v.kind === KIND_IMPORT_META) {
				// @ts-ignore
				resolved = await resolveImportMeta(v.property, id);
			}

			if (!resolved) return;

			if (v.start !== v.end) {
				s.overwrite(v.start, v.end, resolved);
			} else {
				s.prependLeft(v.start, resolved);
			}
		})
	);

	return {
		code: s.toString(),
		map: sourcemap ? s.generateMap({ source: id, file: path.posix.basename(id), includeContent: true }) : null
	};
}
