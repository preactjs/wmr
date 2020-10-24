import parse from './cjs-module-lexer.js';

/** @template T @typedef {Promise<T>|T} MaybePromise */

/** @typedef {(specifier: string, id?: string) => MaybePromise<string|false|null|void>} ResolveFn */

/**
 * @param {string} code Module code
 * @param {string} id Source module specifier
 * @param {object} [options]
 * @param {ResolveFn?} [options.resolveId] Return a replacement for require specifiers
 */
export async function transformRequires(code, id, { resolveId } = {}) {
	const { requires } = await parse(code, id);
	let out = '';

	let resolveIds = 0;
	const toResolve = new Map();

	const field = (spec, resolver, a, b) => {
		const match = toResolve.get(spec);
		if (match) return match.placeholder;
		const placeholder = `%%_RESOLVE_#${++resolveIds}#_%%`;
		toResolve.set(spec, {
			placeholder,
			spec,
			p: resolver(a, b)
		});
		return placeholder;
	};

	for (const item of requires) {
		// TODO: go over every item and resolve it through rollup
		let spec = code.substring(item.s, item.e);
		if (resolveId) {
			spec = field(spec, resolveId, spec, id);
		}

		out += spec;
	}

	// Wait for all resolutions to finish and map them to placeholders
	const mapping = new Map();
	await Promise.all(
		Array.from(toResolve.values()).map(async v => {
			mapping.set(v.placeholder, (await v.p) || v.spec);
		})
	);

	out = out.replace(/%%_RESOLVE_#\d+#_%%/g, s => mapping.get(s));

	return out;
}
