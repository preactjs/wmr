import path from 'path';
import { transformImports } from '../lib/transform-imports.js';
import { isFile } from '../lib/fs-utils.js';
import { PREFIX_REG } from '../lib/net-utils.js';

const SCRIPT_EXTS = ['.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs', '.mts', '.cts'];
const SCRIPT_EXT_INDEX = [...SCRIPT_EXTS, ...SCRIPT_EXTS.map(ext => '/index' + ext)];

const VIRTUAL = '/id:';

/**
 * @param {object} options
 * @param {string} options.root
 * @return {import("rollup").Plugin}
 */
export function finalizeDev({ root }) {
	/** @type {Set<string>} */
	const moduleFlag = new Set();

	return {
		name: 'finalize-dev',
		async resolveId(id, importer, options) {
			const { custom } = options;
			console.log(id, custom);
			if (custom) {
				if (custom.isModule) {
					moduleFlag.add(id);
				} else {
					moduleFlag.delete(id);
				}
			}
		},
		async transform(code, id) {
			if (!moduleFlag.has(id) && path.posix.extname(id) !== '') return;

			/** @type {typeof this.resolve} */
			const resolver = this.resolve.bind(this);

			const out = await transformImports(code, id, {
				async resolveId(spec) {
					// console.log('SPEC', JSON.stringify(spec));
					const resolved = await resolver(spec, id);
					const resolvedSpec = resolved ? resolved.id : id;
					const match = /(.*)(?:\?(.*))?/.exec(resolvedSpec);

					if (!match) return;

					let [, s, query] = match;
					query = query ? query + '&module' : '?module';

					// Return prefix if they have any
					//   \0foo-bar:asdf -> /foo-bar:asdf
					const prefixMatch = s.match(PREFIX_REG);
					if (prefixMatch) {
						return '/' + s.slice(1);
						const prefix = prefixMatch[1];
						let pathname = s.slice(prefix.length);
						pathname = pathname.startsWith('/') ? 'id:' + pathname : pathname;
						return '/' + prefix.slice(1) + '/' + pathname;
					}

					// Detect virtual paths
					if (
						!/^(?:[./]|data:|https?:\/\/)/.test(spec) ||
						(/^\//.test(s) && !(await isFile(path.resolve(root, s.slice(1)))))
					) {
						return VIRTUAL + s + (!SCRIPT_EXTS.includes(path.posix.extname(s)) ? query : '');
					}
					// Resolve extension or `/index.js` path for relative browser
					// imports to resolve from the right folder
					else if (/^\.\.?/.test(s) && path.posix.extname(s) === '') {
						for (let i = 0; i < SCRIPT_EXT_INDEX.length; i++) {
							const ext = SCRIPT_EXT_INDEX[i];
							let file = path.resolve(root, s + ext);
							if (await isFile(file)) {
								s += ext;
							}
						}
					}

					return s + (!SCRIPT_EXTS.includes(path.posix.extname(s)) ? query : '');
				}
			});

			if (out.code !== code) {
				return out;
			}
		}
	};
}
