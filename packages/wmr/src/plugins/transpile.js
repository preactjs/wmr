import swcPlugin from 'rollup-plugin-swc';
import Visitor from '@swc/core/Visitor.js';

class ConsoleStripper extends Visitor.default {
	visitProgram(e) {
		const preactImport = e.body.find(d => d.type === 'ImportDeclaration' && d.source && d.source.value === 'preact');
		if (!preactImport) {
			return {
				...e,
				body: [
					{
						type: 'ImportDeclaration',
						specifiers: [
							{
								type: 'ImportSpecifier',
								local: {
									type: 'Identifier',
									value: 'h'
								}
							},
							{
								type: 'ImportSpecifier',
								local: {
									type: 'Identifier',
									value: 'Fragment'
								}
							}
						],
						source: {
							type: 'StringLiteral',
							value: 'preact'
						}
					},
					...e.body
				]
			};
		}

		if (!preactImport.specifiers.find(x => x.local.value === 'h')) {
			preactImport.specifiers.push({
				type: 'ImportSpecifier',
				local: {
					type: 'Identifier',
					value: 'h'
				}
			});
		}

		if (!preactImport.specifiers.find(x => x.local.value === 'Fragment')) {
			preactImport.specifiers.push({
				type: 'ImportSpecifier',
				local: {
					type: 'Identifier',
					value: 'Fragment'
				}
			});
		}

		return e;
	}
}

export const createSwcPlugin = type => {
	if (type === 'typescript') {
		return swcPlugin({
			plugin: m => new ConsoleStripper().visitProgram(m),
			jsc: {
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
				target: 'es2017'
			}
		});
	} else if (type === 'jsx') {
		return swcPlugin({
			plugin: m => new ConsoleStripper().visitProgram(m),
			jsc: {
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
				target: 'es2017'
			}
		});
	}
};
