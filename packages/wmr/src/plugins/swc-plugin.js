import Visitor from '@swc/core/Visitor.js';
import swc from '@swc/core';

class JSXImportAppender extends Visitor.default {
	visitModule(e) {
		const preactImport = e.body.find(d => d.type === 'ImportDeclaration' && d.source && d.source.value === 'preact');

		console.dir(preactImport, { depth: 10 });
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

		if (!preactImport.specifiers.find(x => x.local.value === 'h')) {
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

		if (!preactImport.specifiers.find(x => x.local.value === 'Fragment')) {
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

const swcPlugin = (options = {}) => ({
	name: 'swc',
	async transform(code, filename) {
		options.filename = filename;
		return await swc.transform(code, { ...options });
	}
});

const createSwcPlugin = type => {
	if (type === 'typescript') {
		return swcPlugin({
			plugin: m => {
				return new JSXImportAppender().visitModule(m);
			},
			jsc: {
				loose: true,
				transform: {
					react: {
						pragma: 'h',
						pragmaFrag: 'Fragment'
					}
				},
				parser: {
					syntax: 'typescript',
					tsx: true,
					dynamicImport: true
				},
				target: 'es2018'
			}
		});
	} else if (type === 'jsx') {
		return swcPlugin({
			plugin: m => {
				return new JSXImportAppender().visitModule(m);
			},
			jsc: {
				loose: true,
				transform: {
					react: {
						pragma: 'h',
						pragmaFrag: 'Fragment'
					}
				},
				parser: {
					syntax: 'ecmascript',
					jsx: true,
					dynamicImport: true
				},
				target: 'es2018'
			}
		});
	}
};

export default createSwcPlugin;
