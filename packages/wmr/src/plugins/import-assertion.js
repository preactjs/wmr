import { importAssertions } from 'acorn-import-assertions';
import { transform } from 'escorn';

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
				sourceMap: sourcemap
			});

			return {
				code: res.code,
				map: res.map
			};
		}
	};
}

/**
 * @type {import('escorn').Plugin}
 */
function transformImportAssertions({ types: t }) {
	return {
		name: 'transform-import-assertions',
		visitor: {
			CallExpression(path) {
				if (!t.isImport(path.node.callee)) return;

				const args = path.node.arguments;
				if (!args || args.length < 2) return;
				const source = args[0];
				const assertions = args[1];
				if (!t.isStringLiteral(source) || !t.isObjectExpression(assertions)) return;

				if (!assertions.properties) return;
				for (let i = 0; i < assertions.properties.length; i++) {
					const prop = assertions.properties[i];

					if (t.isSpreadElement(prop) || !t.isIdentifier(prop.key) || prop.key.name !== 'assert') {
						continue;
					}

					if (
						t.isObjectMethod(prop) ||
						!t.isObjectExpression(prop.value) ||
						!prop.value.properties ||
						!prop.value.properties.length
					) {
						continue;
					}

					const innerProp = prop.value.properties[0];
					if (!t.isObjectProperty(innerProp)) continue;
					if (!t.isIdentifier(innerProp.key) || innerProp.key.name !== 'type' || !t.isStringLiteral(innerProp.value)) {
						continue;
					}

					const type = innerProp.value.value;
					path.replaceWith(t.callExpression(t.import(), [t.stringLiteral(`${type}:${source.value}`)]));
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
