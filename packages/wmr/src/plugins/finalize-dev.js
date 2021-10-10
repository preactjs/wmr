import path from 'path';
import { transformImports } from '../lib/transform-imports.js';
import { PREFIX_REG } from '../lib/net-utils.js';

/**
 * @param {object} options
 * @param {string} options.root
 * @param {Set<string>} options.prefixes
 * @param {string[]} options.extensions
 * @return {import("rollup").Plugin}
 */
export function finalizeDev({ root, prefixes, extensions }) {
	const resolveExts = new Set(extensions);

	return {
		name: 'finalize-dev',
		async transform(code, id) {
			/** @type {typeof this.resolve} */
			const resolver = this.resolve.bind(this);

			console.log(this);

			const out = await transformImports(code, id, {
				async resolveImportMeta(spec, importer) {
					const m = spec.match(/^ROLLUP_FILE_URL_(\d+)$/);
					if (m) {
						console.log('META', spec, importer, m);
					}
				},
				async resolveId(spec) {
					const resolved = await resolver(spec, id);
					const resolvedSpec = resolved ? resolved.id : id;
					const match = /(.*)(?:\?(.*))?/.exec(resolvedSpec);

					if (!match) return;

					let [, s, query] = match;

					// Return prefix if they have any
					//   \0foo-bar:asdf -> /foo-bar:asdf
					const prefixMatch = s.match(PREFIX_REG);
					if (prefixMatch) {
						let prefix = prefixMatch[1];
						let pathname = s.slice(prefix.length);

						pathname = pathname.startsWith('/') ? 'id:' + pathname : pathname;
						prefix = prefix.slice(1, -1);
						prefixes.add(prefix);
						return '/@' + prefix + '/' + pathname;
					}

					const param = !resolveExts.has(path.posix.extname(s)) ? (query ? query + '&module' : '?module') : '';

					// Detect absolute urls
					if (!/^(?:[./]|data:|https?:\/\/)/.test(s)) {
						return s;
					}
					// Detect urls that look like a prefix
					else if (/^@/.test(s)) {
						return '/@id/' + s;
					} else if (/^\//.test(s)) {
						// ^TODO: Check windows
						// TODO: Resolve alias
						const rootRelative = path.relative(root, s);
						// Check if path is inside root
						if (!rootRelative.startsWith('..')) {
							const rel = path.relative(path.dirname(path.join(root, id)), s);
							return './' + rel + param;
						}
						return '/@id' + s + param;
					}

					return s + param;
				}
			});

			if (out.code !== code) {
				return out;
			}
		}
	};
}
