import fs from 'fs';
import acorn from 'acorn';
import * as acornWalk from 'acorn-walk';
import * as jsxWalk from 'acorn-jsx-walk';
import * as astringLib from 'astring';
import acornJsx from 'acorn-jsx';
const cjsDefault = m => ('default' in m ? m.default : m);
import Benchmark from './benchmark.cjs';

/** @type {typeof astringLib} */
const astring = cjsDefault(astringLib);

const Parser = acorn.Parser.extend(acornJsx());

const walk = cjsDefault(acornWalk);
cjsDefault(jsxWalk).extend(walk.base);

let codegenContext;

function generateViaAstring(node, ctx) {
	codegenContext = ctx;
	return astring.generate(node, {
		generator: codeGenerator
	});
}

let codeGenerator = {
	...astring.baseGenerator,
	StringLiteral(node, state) {
		if (node.raw) state.write(node.raw);
		state.write(`'${node.value.replace(/'/g, "\\'")}'`);
	},
	ImportSpecifier(node, state) {
		const { imported, local } = node;
		if (imported && imported.name !== local.name) {
			this[imported.type](imported, state);
			state.write(' as ');
		}
		this[local.type](local, state);
	},
	ImportDeclaration(node, state) {
		const { specifiers = [], source } = node;
		state.write('import ');
		if (specifiers.length) {
			let defaultSpecifier;
			if (specifiers[0].type === 'ImportDefaultSpecifier') {
				defaultSpecifier = specifiers.shift();
				this[defaultSpecifier.type](defaultSpecifier, state);
			}
			if (specifiers.length) {
				if (defaultSpecifier) state.write(', ');
				state.write('{ ');
				for (const s of specifiers) this[s.type](s, state);
				state.write(' }');
			}
			state.write(' from ');
		}
		this[source.type](source, state);
		state.write(';');
	},
	// import(source)
	ImportExpression(node, state) {
		state.write('import(');
		this[node.source.type](node.source, state);
		state.write(')');
	},
	JSXFragment(node, state) {
		state.write('<>');
		for (const child of node.children) {
			this[child.type](child, state);
		}
		state.write('</>');
	},
	JSXElement(node, state) {
		const { openingElement, children, closingElement } = node;
		this[openingElement.type](openingElement, state);
		if (children) {
			for (const child of children) this[child.type](child, state);
		}
		if (closingElement) this[closingElement.type](closingElement, state);
	},
	JSXOpeningElement(node, state) {
		const { name, attributes, selfClosing } = node;
		state.write('<');
		this[name.type](name, state);
		for (const attr of attributes) this[attr.type](attr, state);
		state.write(selfClosing ? '/>' : '>');
	},
	JSXClosingElement(node, state) {
		state.write('</');
		this[node.name.type](node.name, state);
		state.write('>');
	},
	JSXExpressionContainer(node, state) {
		state.write('{');
		this[node.expression.type](node.expression, state);
		state.write('}');
	},
	JSXIdentifier(node, state) {
		this.Identifier(node, state);
	},
	JSXAttribute(node, state) {
		const { name, value } = node;
		state.write(' ');
		this[name.type](name, state);
		if (value) {
			state.write('=');
			this[value.type](value, state);
		}
	},
	JSXSpreadAttribute(node, state) {
		state.write(' {...');
		this[node.argument.type](node.argument, state);
		state.write('}');
	},
	JSXText(node, state) {
		state.write(node.raw);
	}
};
codeGenerator.ImportDefaultSpecifier = codeGenerator.ImportSpecifier;
codeGenerator.BooleanLiteral = codeGenerator.Literal;
codeGenerator.RegexpLiteral = codeGenerator.Literal;
codeGenerator.NumberLiteral = codeGenerator.Literal;

for (let type in codeGenerator) {
	const fn = codeGenerator[type];
	codeGenerator[type] = function (node, state) {
		if (node == null) return '';
		if (codegenContext) {
			if (node._string) {
				state.write(node._string);
				return;
			}
			if (node.start != null && node.end != null) {
				try {
					state.write(codegenContext.out.slice(node.start, node.end));
					return;
				} catch (e) {}
			}
		}
		fn.call(this, node, state);
	};
}

// ---------------

function generateViaCodegen(node, ctx) {
	codegenContext = ctx;
	return astring.generate(node, {
		generator: codeGenerator
	});
}

function codegenParens(node) {
	if (node.type === 'AssignmentExpression') {
		return `(${codegen(node)})`;
	}
	return codegen(node);
}

/** @param {Node} node */
function codegen(node) {
	const ctx = codegenContext;
	if (node == null) return '';
	if (ctx && node._string) {
		return node._string;
	}
	if (ctx && node.start != null && node.end != null) {
		try {
			return ctx.out.slice(node.start, node.end);
		} catch (e) {}
	}

	switch (node.type) {
		case 'Expression':
		case 'ExpressionStatement':
			return codegen(node.expression);
		case 'SequenceExpression':
			return node.expressions.map(codegenParens).join(',');
		case 'IfStatement':
			return `if(${codegen(node.test)})${codegen(node.consequent)}`;
		case 'ConditionalExpression':
			return `${codegen(node.test)}?${codegen(node.consequent)}:${codegen(node.alternate)}`;
		case 'Program':
			return node.body.map(codegen).join(';\n');
		case 'BlockStatement':
			return `{${node.body.map(codegen).join(';\n')}}`;
		case 'MemberExpression':
			if (node.computed) return codegen(node.object) + '[' + codegen(node.property) + ']';
			return codegen(node.object) + '.' + codegen(node.property);
		case 'ArrayExpression':
		case 'ArrayPattern':
			return `[${node.elements.map(codegen).join(',')}]`;
		case 'ObjectExpression':
		case 'ObjectPattern':
			return `{${node.properties.map(codegen).join(',')}}`;
		case 'Property': {
			let key = codegen(node.key);
			let value = codegen(node.value);
			if (node.computed) key = `[${key}]`;
			if (node.method) return value.replace('function', key);
			if (node.shorthand && key === value) return key;
			return `${key}: ${value}`;
		}
		case 'AssignmentExpression':
		case 'AssignmentPattern':
			return `${codegen(node.left)}=${codegen(node.right)}`;
		case 'LogicalExpression':
		case 'BinaryExpression':
			return `${codegenParens(node.left)} ${node.operator} ${codegenParens(node.right)}`;
		case 'UnaryExpression':
			return `${node.operator}${codegenParens(node.argument)}`;
		case 'ReturnStatement':
			return `return ${codegenParens(node.argument)}`;
		case 'Identifier':
			return node.name;
		case 'Literal':
		case 'NumberLiteral':
		case 'BooleanLiteral':
		case 'RegexpLiteral': {
			if (node.raw) return node.raw;
			let { value } = node;
			if (value === 'true' || value === 'false' || isNaN(Number(value))) {
				return value;
			}
			value = value.replace(/\n/g, '\\n');
			if (value.indexOf(`'`) === -1) return `'${value}'`;
			if (value.indexOf(`"`) === -1) return `"${value}"`;
			return `'${value.replace(/'/g, `\\'`)}'`;
		}
		case 'StringLiteral':
			return `'${node.value.replace(/'/g, "\\'")}'`;
		case 'TaggedTemplateExpression':
			return codegen(node.tag) + codegen(node.quasi);
		case 'TemplateLiteral': {
			let out = '`';
			for (let i = 0, { quasis, expressions } = node; i < quasis.length; i++) {
				out += quasis[i].value.raw;
				if (i < expressions.length) {
					out += '${' + codegen(expressions[i]) + '}';
				}
			}
			return out + '`';
		}
		case 'ThisExpression':
			return 'this';
		case 'VariableDeclaration':
			return node.kind + ' ' + node.declarations.map(codegen).join(',');
		case 'VariableDeclarator':
			return codegen(node.id) + (node.init ? '=' + codegen(node.init) : '');
		case 'ImportSpecifier':
		case 'ImportDefaultSpecifier': {
			const { imported, local } = node;
			return `${imported && imported.name !== local.name ? codegen(imported) + ' as ' : ''}${codegen(local)}`;
		}
		case 'ImportDeclaration': {
			const { specifiers = [], source } = node;
			let str = '';
			if (specifiers.length) {
				if (specifiers[0].type === 'ImportDefaultSpecifier') str += codegen(specifiers.shift());
				if (specifiers.length) str += `${str ? ', ' : ''}{ ${specifiers.map(codegen).join(', ')} }`;
				str += ' from ';
			}
			return 'import ' + str + codegen(source) + '';
		}
		case 'ArrowFunctionExpression':
			return `${node.async ? 'async ' : ''}(${node.params.map(codegen)}) => ${codegen(node.body)}`;
		case 'CallExpression':
			return `${codegen(node.callee)}(${node.arguments.map(codegen)})`;
	}

	throw Error(`Unknown AST Node type: ${node.type}`);
}

const code = fs.readFileSync('./test/fixtures/_unit/es2020.js', 'utf-8');
const ast = Parser.parse(code, { sourceType: 'module', ecmaVersion: 2020 });

function benchmark() {
	new Benchmark.Suite()
		.add('astring', function () {
			generateViaAstring(ast);
		})
		.add('codegen', function () {
			generateViaCodegen(ast);
		})
		.on('cycle', function (event) {
			console.log(String(event.target));
		})
		.on('complete', function () {
			console.log('Fastest is ' + this.filter('fastest').map('name'));
		})
		.run({ async: true });
}

for (let i = 10; i--; ) {
	generateViaAstring(ast);
	generateViaCodegen(ast);
}

setTimeout(() => {
	benchmark();
}, 1000);
