import { importAssertions } from 'acorn-import-assertions';
import { transform } from '../lib/acorn-traverse.js';

/**
 * Rewrite import assertions to url prefixes. This is done because
 * import assertions are not widely available yet.
 *
 * ```js
 * // Before
 * import foo from "./foo.json" assert { type: "json" };
 *
 * // After
 * import foo from "json:./foo.json";
 * ```
 *
 * @returns {import("rollup").Plugin}
 */
export function importAssertionPlugin() {
	return {
		name: 'import-assertion',
		options(opts) {
			// @ts-ignore
			opts.acornInjectPlugins = [importAssertions, ...(opts.acornInjectPlugins || [])];
			return opts;
		},
		transform(code, id) {
			if (!/\.[tj]sx?$/.test(id)) return;

			const res = transform(code, {
				parse: this.parse,
				plugins: [transformImportAssertions]
			});
			return {
				code: res.code,
				map: res.map
			};
		}
	};
}

/**
 * @type {import('../lib/acorn-traverse').Plugin}
 */
function transformImportAssertions({ types: t }) {
	return {
		name: 'transform-import-assertions',
		visitor: {
			ImportDeclaration(path) {
				const { assertions } = path.node;
				if (assertions && assertions.length > 0) {
					for (let i = 0; i < assertions.length; i++) {
						const node = assertions[i];
						if (t.isImportAttribute(node) && t.isIdentifier(node.key) && node.key.name === 'type') {
							const type = node.value.value;
							path.replaceWith(
								t.importDeclaration(path.node.specifiers, t.stringLiteral(`${type}:${path.node.source?.value}`))
							);
						}
					}
				}
			}
		}
	};
}
