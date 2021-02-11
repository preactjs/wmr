import Visitor from '@swc/core/Visitor.js';
import swc from '@swc/core';

class JSXImportAppender extends Visitor.default {
	visitModule(e) {
		const imports = e.body.filter(d => d.type === 'ImportDeclaration');
		const preactImport = imports.find(imp => imp.source.value === 'preact');

		if (!preactImport) {
			e.body.unshift({
				type: 'ImportDeclaration',
				span: { start: 0, end: 0, ctxt: 0 },
				specifiers: [
					{
						type: 'ImportSpecifier',
						span: { start: 0, end: 0, ctxt: 0 },
						local: {
							type: 'Identifier',
							span: { start: 0, end: 0, ctxt: 0 },
							value: 'h',
							typeAnnotation: null,
							optional: false
						}
					},
					{
						type: 'ImportSpecifier',
						span: { start: 0, end: 0, ctxt: 0 },
						local: {
							type: 'Identifier',
							span: { start: 0, end: 0, ctxt: 0 },
							value: 'Fragment',
							typeAnnotation: null,
							optional: false
						}
					}
				],
				source: {
					type: 'StringLiteral',
					span: { start: 0, end: 0, ctxt: 0 },
					value: 'preact',
					hasEscape: false,
					kind: { type: 'normal', containsQuote: true }
				},
				asserts: null,
				typeOnly: false
			});

			return { ...e, body: [...e.body] };
		}

		const hasH = imports.find(imp => !!imp.specifiers.find(x => x.local.value === 'h'));
		if (!hasH) {
			preactImport.specifiers.push({
				type: 'ImportSpecifier',
				span: { start: 0, end: 0, ctxt: 0 },
				typeAnnotation: null,
				optional: false,
				local: {
					type: 'Identifier',
					span: { start: 0, end: 0, ctxt: 0 },
					value: 'h',
					typeAnnotation: null,
					optional: false
				}
			});
		}

		const hasFrag = imports.find(imp => !!imp.specifiers.find(x => x.local.value === 'Fragment'));
		if (!hasFrag) {
			preactImport.specifiers.push({
				type: 'ImportSpecifier',
				span: { start: 0, end: 0, ctxt: 0 },
				typeAnnotation: null,
				optional: false,
				local: {
					type: 'Identifier',
					span: { start: 0, end: 0, ctxt: 0 },
					value: 'Fragment',
					typeAnnotation: null,
					optional: false
				}
			});
		}

		return { ...e, body: [...e.body] };
	}
}

const typeScriptOptions = {
	test: '.*.tsx?$',
	plugin: m => {
		return new JSXImportAppender().visitModule(m);
	},
	jsc: {
		loose: true,
		transform: {
			react: {
				pragma: 'h',
				pragmaFrag: 'Fragment',
				development: false,
				throwIfNamespace: false,
				useBuiltins: false
			}
		},
		parser: {
			syntax: 'typescript',
			tsx: true,
			dynamicImport: true
		},
		target: 'es2018'
	}
};

const jsxOptions = {
	test: '.*.jsx?$',
	plugin: m => {
		return new JSXImportAppender().visitModule(m);
	},
	jsc: {
		loose: true,
		transform: {
			react: {
				pragma: 'h',
				pragmaFrag: 'Fragment',
				development: false,
				throwIfNamespace: false,
				useBuiltins: false
			}
		},
		parser: {
			syntax: 'ecmascript',
			jsx: true,
			dynamicImport: true
		},
		target: 'es2018'
	}
};

/**
 * Transform SASS files with node-sass.
 * @returns {import('rollup').Plugin}
 */
const swcPlugin = () => ({
	name: 'swc',
	async transform(code, filename) {
		if (/^[\0\b]/.test(filename) || !/\.(mjs|jsx?|tsx?)$/.test(filename)) return null;

		let result = { code };
		if (/tsx?$/.test(filename)) result = await swc.transform(result.code, { ...typeScriptOptions, filename });
		else result = await swc.transform(result.code, { ...jsxOptions, filename });

		return result;
	}
});

export default swcPlugin;
