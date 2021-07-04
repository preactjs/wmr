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
 * @param {object} options
 * @param {boolean} options.sourcemap
 * @returns {import("rollup").Plugin}
 */
export function importAssertionPlugin({ sourcemap }) {
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
				plugins: [transformImportAssertions],
				filename: id,
				// Default is to generate sourcemaps, needs an explicit
				// boolean
				sourceMaps: !!sourcemap
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
			ImportExpression(path) {
				const args = path.node.arguments;
				if (!args || !args.length) return;
				if (!t.isObjectExpression(args[0])) return;

				if (!args[0].properties) return;
				for (let i = 0; i < args[0].properties.length; i++) {
					const prop = args[0].properties[i];

					if (!t.isIdentifier(prop.key) || prop.key.name !== 'assert') {
						continue;
					}

					if (!t.isObjectExpression(prop.value) || !prop.value.properties || !prop.value.properties.length) {
						continue;
					}

					const innerProp = prop.value.properties[0];
					if (!t.isIdentifier(innerProp.key) || innerProp.key.name !== 'type') {
						continue;
					}

					const type = innerProp.value.value;
					path.replaceWith(t.importExpression(t.stringLiteral(`${type}:${path.node.source.value}`)));
				}
			},
			ImportDeclaration(path) {
				const { assertions } = path.node;
				if (assertions && assertions.length > 0) {
					for (let i = 0; i < assertions.length; i++) {
						const node = assertions[i];
						if (t.isImportAttribute(node) && t.isIdentifier(node.key) && node.key.name === 'type') {
							const type = node.value.value;
							path.replaceWith(
								t.importDeclaration(path.node.specifiers, t.stringLiteral(`${type}:${path.node.source.value}`))
							);
						}
					}
				}
			}
		}
	};
}
