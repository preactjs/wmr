import Visitor from '@swc/core/Visitor.js';
import swc from '@swc/core';

class JSXImportAppender extends Visitor.default {
	constructor(options) {
		super();
		this.hasJSX = false;
		this.jsx = options.jsx;
		this.from = options.from;
	}

	visitTsType(e) {
		return e;
	}

	visitJSXOpeningElement(e) {
		this.hasJSX = true;
		return super.visitJSXOpeningElement(e);
	}

	visitModule(e) {
		super.visitModule(e);

		if (!this.hasJSX) return e;

		const imports = e.body.filter(d => d.type === 'ImportDeclaration');
		const preactImport = imports.find(imp => imp.source.value === this.from);

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
							value: this.jsx,
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
					value: this.from,
					hasEscape: false,
					kind: { type: 'normal', containsQuote: true }
				},
				asserts: null,
				typeOnly: false
			});

			return { ...e, body: [...e.body] };
		}

		const hasH = imports.find(imp => !!imp.specifiers.find(x => x.local.value === this.jsx));
		if (!hasH) {
			preactImport.specifiers.push({
				type: 'ImportSpecifier',
				span: { start: 0, end: 0, ctxt: 0 },
				typeAnnotation: null,
				optional: false,
				local: {
					type: 'Identifier',
					span: { start: 0, end: 0, ctxt: 0 },
					value: this.jsx,
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

/**
 * Transform JS/TS files with swc.
 * @param {object} [opts]
 * @param {string} [opts.jsx]
 * @param {string} [opts.from]
 * @returns {import('rollup').Plugin}
 */
const swcPlugin = ({ jsx = 'h', from = 'preact' }) => ({
	name: 'swc',
	async transform(code, filename) {
		if (/^[\0\b]/.test(filename) || !/\.(mjs|jsx?|tsx?)$/.test(filename)) return null;

		let result = { code };
		if (/tsx?$/.test(filename)) {
			result = await swc.transform(result.code, {
				test: '.*.tsx?$',
				jsc: {
					loose: true,
					transform: {
						react: {
							pragma: jsx,
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
				},
				filename,
				plugin: m => {
					return new JSXImportAppender({ jsx, from }).visitModule(m);
				}
			});
		} else {
			result = await swc.transform(result.code, {
				test: '.*.jsx?$',
				jsc: {
					loose: true,
					transform: {
						react: {
							pragma: jsx,
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
				},
				filename,
				plugin: m => {
					return new JSXImportAppender({ jsx, from }).visitModule(m);
				}
			});
		}

		return result;
	}
});

export default swcPlugin;
