import * as acornWalk from 'acorn-walk';
import * as jsxWalk from 'acorn-jsx-walk';
import MagicString from 'magic-string';
import * as astringLib from 'astring';
import { codeFrame } from './output-utils.js';
import { posix } from 'path';

/**
 * @fileoverview
 * This is an attempt to implement Babel's APIs on top of Acorn.
 * You're probably looking for transform().
 */

const cjsDefault = m => ('default' in m ? m.default : m);

/** @type {typeof astringLib} */
const astring = cjsDefault(astringLib);

const walk = cjsDefault(acornWalk);
cjsDefault(jsxWalk).extend(walk.base);

/**
 * @typedef Node
 * @type {Omit<import('acorn').Node, 'start'|'end'> & { _string?: string, start?: number, end?: number, value?: any, selfClosing?: boolean, name?: any, computed?: boolean, test?: Node, consequent?: Node, expression?: Node, expressions?: Node[], id?: Node, init?: Node, block?: Node, object?: Node, property?: Node, body?: Node[], tag?: Node, quasi?: Node, quasis?: Node[], declarations?: Node[], properties?: Node[], children?: Node[], elements?: Node[], key?: Node, shorthand?: boolean, method?: boolean, imported?: Node, local?: Node, specifiers?: Node[], source?: Node, left?: Node, right?: Node, operator?: string, raw?: string, argument?: Node, arguments?: Node[], async?: boolean, params?: Node[], callee?: Node }}
 */

/**
 * @typedef State
 * @type {Map & { opts: object } & Record<any, any>}
 */

/**
 * @typedef VisitorFn
 * @type {(path: Path, state: State) => void}
 */

/**
 * @typedef Visitor
 * @type {VisitorFn | { enter?: VisitorFn, exit?: VisitorFn }}
 */

/**
 * @typedef PluginContext
 * @type {{ name: string, visitor: Record<string, Visitor> }}
 */

/**
 * @typedef Plugin
 * @type {(api: { types: typeof types, template: typeof template }) => PluginContext}
 */

/** @type {ReturnType<typeof createContext> | empty} */
let codegenContext;

/**
 * @param {Node} node
 * @param {ReturnType<typeof createContext>} [ctx]
 */
export function generate(node, ctx) {
	codegenContext = ctx;
	// TODO: infer `indent` option from ctx.source
	return astring.generate(node, {
		generator: codeGenerator
	});
}

let codeGenerator = {
	...astring.baseGenerator,
	ObjectExpression(node, state) {
		if (!node.properties.length) {
			state.write('{}');
		} else if (node.properties.length <= 5) {
			state.write('{ ');
			for (let i = 0; i < node.properties.length; i++) {
				const prop = node.properties[i];
				this[prop.type](prop, state);
				if (i < node.properties.length - 1) {
					state.write(', ');
				}
			}
			state.write(' }');
		} else {
			// Astring inserts line indents by default
			// eslint-disable-next-line new-cap
			astring.baseGenerator.ObjectExpression.call(this, node, state);
		}
	},

	// Babel compat
	StringLiteral(node, state) {
		if (node.raw) state.write(node.raw);
		else state.write(`'${node.value.replace(/'/g, "\\'")}'`);
	},
	NullLiteral(node, state) {
		state.write('null');
	},
	// end babel compat

	ImportSpecifier(node, state) {
		const { imported, local } = node;
		if (imported && imported.name !== local.name) {
			this[imported.type](imported, state);
			state.write(' as ');
		}
		this[local.type](local, state);
	},
	ImportDefaultSpecifier(node, state) {
		const { local } = node;
		this[local.type](local, state);
	},
	ImportNamespaceSpecifier(node, state) {
		const { local } = node;
		state.write('* as ');
		this[local.type](local, state);
	},
	ImportDeclaration(node, state) {
		const { specifiers = [], source } = node;
		state.write('import ');
		if (specifiers.length) {
			if (specifiers[0].type === 'ImportNamespaceSpecifier') {
				const s = specifiers[0];
				this[s.type](s, state);
			} else {
				let defaultSpecifier;
				if (specifiers[0].type === 'ImportDefaultSpecifier') {
					defaultSpecifier = specifiers.shift();
					this[defaultSpecifier.type](defaultSpecifier, state);
				}

				if (specifiers.length) {
					if (defaultSpecifier) state.write(', ');
					state.write('{ ');
					for (let i = 0; i < specifiers.length; i++) {
						const s = specifiers[i];
						this[s.type](s, state);
						if (i < specifiers.length - 1) {
							state.write(', ');
						}
					}
					state.write(' }');
				}
			}

			state.write(' from ');
		}

		this[source.type](source, state);
		state.write(';');
	},
	// import(source)
	ImportExpression(node, state) {
		state.write('import(');

		// TODO: Sometimes this seems to have a source and sometimes
		// an expression. I don't understand why. The expression seems
		// to be only set when calling `t.importExpression()`
		if (node.source) {
			this[node.source.type](node.source, state);
		} else {
			this[node.expression.type](node.expression, state);
		}

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
		if (node.expression.type === 'JSXEmptyExpression') {
			return;
		}
		state.write('{');
		this[node.expression.type](node.expression, state);
		state.write('}');
	},
	JSXMemberExpression(node, state) {
		this[node.object.type](node.object, state);
		state.write('.');
		this[node.property.type](node.property, state);
	},
	JSXIdentifier(node, state) {
		// eslint-disable-next-line new-cap
		this.Identifier(node, state);
	},
	JSXNamespacedName(node, state) {
		const { name, namespace } = node;
		this[namespace.type](namespace, state);
		state.write(':');
		this[name.type](name, state);
	},
	JSXAttribute(node, state) {
		const { name, value } = node;
		state.write(' ');
		this[name.type](name, state);
		if (value) {
			state.write('=');

			// JSX needs double quotes instead of single quotes
			if (types.isStringLiteral(value)) {
				value.raw = JSON.stringify(value.value);
			}

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
	},

	// classes
	PropertyDefinition(node, state) {
		this[node.key.type](node.key, state);
		state.write(' = ');
		this[node.value.type](node.value, state);
		state.write(';\n');
	}
};
codeGenerator.BooleanLiteral = codeGenerator.Literal;
codeGenerator.RegexpLiteral = codeGenerator.Literal;
codeGenerator.NumericLiteral = codeGenerator.Literal;
codeGenerator.ClassProperty = codeGenerator.PropertyDefinition;

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

// Useful for debugging missing AST node serializers
// codeGenerator = new Proxy(codeGenerator, {
// 	get(target, key) {
// 		if (Reflect.has(target, key)) {
// 			return target[key];
// 		}
// 		throw Error(`No code generator defined for ${key}`);
// 	}
// });

function createTemplate(parse) {
	/**
	 *
	 * @param {TemplateStringsArray} str
	 * @returns {(replacements: Record<string, Node>) => Node}
	 */
	function template(str) {
		str = String(str);
		return (replacements = {}) => {
			const code = str.replace(/[A-Z0-9]+/g, s => {
				return s in replacements ? generate(replacements[s]) : s;
			});

			return template.ast(code);
		};
	}

	template.ast = function (str, expressions = []) {
		if (Array.isArray(str)) {
			str = str.reduce((str, q, i) => str + q + (i === expressions.length ? '' : expressions[i]), '');
		}

		const parsed = parse(str, { expression: true });
		// Remove outer program node
		const ast = parsed.body[0];
		clearPositionData(ast);
		return ast;
	};

	return template;
}

// keep things clean by making some properties non-enumerable
function def(obj, key, value) {
	Object.defineProperty(obj, key, { value });
}

class Path {
	/**
	 * @param {Node} node
	 * @param {Node[]} ancestors
	 * @param {ReturnType<typeof createContext>} ctx
	 */
	constructor(node, ancestors, ctx) {
		if (node && ctx.paths.has(node)) {
			return ctx.paths.get(node);
		}

		/** @type {Node} */
		this.node = node;
		this.ancestors = ancestors;
		this.ctx = ctx;
		this.shouldStop = false;
		this.shouldSkip = false;
		def(this, 'ancestors', ancestors);
		def(this, 'ctx', ctx);
		def(this, 'shouldStop', false);

		this.start = node && node.start;
		this.end = node && node.end;

		/** @type {string | number} */
		this.key = null;
		/** @type {string} */
		this.parentKey = this.listKey = null;
		this.inList = false;
		if (node) {
			const parent = this.parent;
			for (const key in parent) {
				const entry = parent[key];
				if (entry === node) {
					this.key = this.parentKey = key;
				} else if (Array.isArray(entry)) {
					const index = entry.indexOf(node);
					if (index !== -1) {
						this.inList = true;
						this.listKey = this.parentKey = key;
						this.key = index;
					}
				}
			}

			ctx.paths.set(node, this);
		}
	}

	get hub() {
		return this.ctx.hub;
	}

	get parentPath() {
		let ancestors = this.ancestors.slice();
		let parent = ancestors.pop();
		if (!parent) return undefined;
		return new Path(parent, ancestors, this.ctx);
	}

	get parent() {
		return this.ancestors[this.ancestors.length - 1];
	}

	get _containerPath() {
		const ancestors = this.ancestors.slice();
		let node;
		while ((node = ancestors.pop())) {
			if (Object.prototype.hasOwnProperty.call(node, 'body')) {
				return new Path(node, ancestors, this.ctx);
			}
		}
		return null;
	}

	get container() {
		const containerPath = this._containerPath;
		return containerPath && containerPath.node;
	}

	get type() {
		return this.node.type;
	}

	// @TODO siblings

	/**
	 * @param {(path: Path) => boolean} fn
	 * @returns {Path | null}
	 */
	find(fn) {
		let p = this;
		do {
			if (fn(p)) return p;
		} while ((p = p.parentPath));
		return null;
	}

	/**
	 * @param {string} source The module source
	 * @param {string} [name] The imported name
	 * @returns {boolean}
	 */
	referencesImport(source, name) {
		if (!types.isIdentifier(this.node)) return false;

		const binding = this.scope.getBinding(this.node.name);
		if (!binding) return false;

		const parent = binding.path.parentPath;
		if (!types.isImportDeclaration(parent.node)) return false;

		if (parent.node.source.value !== source) {
			return false;
		}

		if (!name) return true;

		const node = binding.path.node;
		if (types.isImportDefaultSpecifier(node) && name === 'default') {
			return true;
		}

		if (types.isImportNamespaceSpecifier(node) && name === '*') {
			return true;
		}

		if (types.isImportSpecifier(node) && node.imported.name === name) {
			return true;
		}

		return false;
	}

	traverse(visitor, state) {
		this.ctx.visit(this.node, visitor, state);
	}

	/** @param {(path: Path) => any} callback */
	forEach(callback) {
		const arr = Array.isArray(this.node) ? this.node : [this.node];
		arr.forEach(n => {
			callback(new Path(n, this.ancestors.slice(), this.ctx));
		});
	}

	/**
	 * @param {string} selector
	 * @returns {Path}
	 */
	get(selector) {
		const ancestors = this.ancestors.slice();
		let node = this.node;
		let token;
		const tokenizer = /(?:(?:\.|^)([^.[]+)|\[([^[\]]+)\])/g;
		while ((token = tokenizer.exec(selector))) {
			const name = token[1] || token[2];
			const prev = node;
			node = node[name];

			if (!Array.isArray(prev)) {
				ancestors.push(prev);
			}
		}
		return new Path(node, ancestors, this.ctx);
	}

	/** @param {Path | Node} node */
	replaceWith(node) {
		if (node instanceof Path) node = node.node;

		this.node = node;
		if (this.inList) this.parent[this.listKey][this.key] = node;
		else this.parent[this.parentKey] = node;
		this.ctx.paths.set(node, this);

		if (this._regenerateParent()) {
			this._hasString = false;
		} else {
			// Skip string generate optimizations as node positions won't
			// match anymore.
			let str = generate(node, this.ctx);

			// Avoid duplicate semicolons when replacing nodes
			if (str[str.length - 1] === ';' && this.ctx.out.original[this.end] === ';') {
				str = str.slice(0, -1);
			}

			this._hasString = true;
			this.ctx.out.overwrite(this.start, this.end, str);
		}

		this._requeue();
	}

	/** @param {string} str */
	replaceWithString(str) {
		// walk up the tree and check if we're within an already-replaced root.
		// if so, regenerate the root from AST.
		this.node._string = str;
		if (!this._hasString && this._regenerateParent()) {
			return;
		}
		this._hasString = true;
		this.ctx.out.overwrite(this.start, this.end, str);
	}

	remove() {
		this.replaceWithString('');
	}

	insertAfter(node) {
		// Insert the child into the the container at the next index
		let index = this.key + 1;
		const list = this.parent[this.listKey];
		list.splice(index, 0, node);

		// Update all subsequent Path keys to their shifted indices
		while (++index < list.length) {
			const p = this.ctx.paths.get(list[index]);
			if (p) p.key = index;
		}

		// Create a Path entry for the inserted node, and regenerate the container
		const parent = this.parentPath;
		parent._hasString = true; // Force parent path regeneration

		if (this._regenerateParent()) {
			this._hasString = false;
		}
	}

	/** @param {string} str */
	prependString(str) {
		this.ctx.out.appendLeft(this.start, str);
	}

	/** @param {string} str */
	appendString(str) {
		this.ctx.out.appendRight(this.end, str);
	}

	_regenerate() {
		const { start, end } = this.node;
		this.node.start = this.node.end = this.node._string = null;
		let str = generate(this.node, this.ctx);
		this.node.start = start;
		this.node.end = end;
		this.replaceWithString(str);
	}

	_regenerateParent() {
		let p = this;
		while ((p = p.parentPath)) {
			if (p._hasString === true) {
				p._regenerate();
				return true;
			}
		}
		return false;
	}
	stop() {
		this.shouldStop = true;
	}
	skip() {
		this.shouldSkip = true;
	}
	getOutput() {
		return this.ctx.out.slice(this.start, this.end);
	}
	getSource() {
		return this.ctx.code.substring(this.start, this.end);
	}
	unshiftContainer(property, node) {
		this.node[property].unshift(node);
		if (!this._regenerateParent()) {
			this._regenerate();
		}
	}
	pushContainer(property, node) {
		this.node[property].push(node);
		if (!this._regenerateParent()) {
			this._regenerate();
		}
	}
	_requeue() {
		this.ctx.queue.add(this);
	}

	/** @private */
	_scope = null;

	/** @type {Scope} */
	get scope() {
		let nodePath = this;
		while (!nodePath._scope && nodePath.parentPath) {
			nodePath = nodePath.parentPath;
		}

		if (!nodePath._scope) {
			throw new Error('Scope has not been set');
		}

		return nodePath._scope;
	}
}

/**
 * Holds information about the binding of a variable.
 * TODO: Add references like in babel
 */
class Binding {
	/**
	 * @param {Path} nodePath
	 */
	constructor(nodePath) {
		this.path = nodePath;
	}

	get identifier() {
		return this.path.node;
	}
}

/**
 * Represents a scope layer in JavaScript.
 */
class Scope {
	/** @type {Record<string, Binding>} */
	bindings = {};

	/** @type {Record<string, boolean>} */
	references = {};

	/**
	 * @param {Path} path
	 * @param {Scope | null} [parent]
	 */
	constructor(path, parent = null) {
		this.path = path;
		this.parent = parent;
	}

	get block() {
		return this.path.node;
	}

	/**
	 * @param {string} name
	 * @returns {Binding | undefined}
	 */
	getBinding(name) {
		if (name in this.bindings) {
			return this.bindings[name];
		}

		if (this.parent) {
			return this.parent.getBinding(name);
		}
	}

	/**
	 * @param {string} name
	 * @returns {boolean}
	 */
	hasBinding(name) {
		return name in this.bindings;
	}

	/**
	 * @param {string} name
	 * @returns {Node}
	 */
	generateUidIdentifier(name) {
		return types.identifier(this.generateUid(name));
	}

	/**
	 * @param {string} name
	 * @returns {string}
	 */
	generateUid(name = 'temp') {
		let i = 1;
		name = !name.startsWith('_') ? `_${name}` : name;
		let id = name;

		while (this.hasBinding(id) || id in this.getProgramParent().references) {
			id = name + `${i++}`;
		}

		this.getProgramParent().references[id] = true;

		return id;
	}

	/**
	 * @returns {Scope | null}
	 */
	getFunctionParent() {
		let scope = this;

		while (!types.isFunctionDeclaration(scope.path.node)) {
			scope = scope.parent;
		}

		return scope;
	}

	/**
	 * @returns {Scope}
	 */
	getProgramParent() {
		let scope = this;

		while (!types.isProgram(scope.path.node)) {
			scope = scope.parent;
		}

		return scope;
	}

	/**
	 * @returns {Scope}
	 */
	getBlockParent() {
		let scope = this;

		do {
			const node = scope.path.node;
			if (
				('block' in node && types.isBlockStatement(node.block)) ||
				('body' in node && types.isBlockStatement(node.body)) ||
				types.isProgram(node)
			) {
				break;
			}
		} while ((scope = scope.parent));

		return scope;
	}

	/**
	 * @param {object} options
	 * @param {Node} options.id
	 * @param {Node} [options.init]
	 * @param {"var" | "let"} [options.kind]
	 */
	push({ id, init, kind = 'let' }) {
		let path = this.path;

		// Traverse upwards until we have  a path where we can
		// attach declarations to.
		if (!types.isBlockStatement(path.node) && !types.isProgram(path.node)) {
			path = this.getBlockParent().path;
		}

		const decl = types.variableDeclarator(id, init);
		const declaration = types.variableDeclaration(kind, [decl]);
		path.unshiftContainer('body', declaration);
	}
}

const TYPES = {
	clone(node, deep) {
		// TODO: deep
		const clone = { type: node.type };
		for (let i in node) {
			if (i !== '_string' && i !== 'start' && i !== 'end' && i !== 'loc') {
				clone[i] = node[i];
			}
		}

		clearPositionData(clone);
		return clone;
	},
	cloneDeep(node) {
		if (node !== null && typeof node !== 'object') return node;
		if (Array.isArray(node)) {
			return node.map(i => this.cloneDeep(i));
		}

		const clone = { type: node.type };
		for (let i in node) {
			if (i !== '_string' && i !== 'start' && i !== 'end' && i !== 'loc') {
				clone[i] = node[i];
			}
		}

		clearPositionData(clone);
		return clone;
	},
	identifier: name => ({ type: 'Identifier', name }),
	blockStatement: body => ({ type: 'BlockStatement', body }),
	returnStatement: argument => ({ type: 'ReturnStatement', argument }),

	// babel compat
	stringLiteral: value => ({ type: 'StringLiteral', value }),
	booleanLiteral: value => ({ type: 'BooleanLiteral', value }),
	numericLiteral: value => ({ type: 'NumericLiteral', value }),
	nullLiteral: () => ({ type: 'NullLiteral', value: null }),
	// end babel compat

	classDeclaration: (id, superClass, body) => ({ type: 'ClassDeclaration', id, superClass, body }),
	classBody: body => ({ type: 'ClassBody', body }),
	classProperty: (key, value) => ({ type: 'ClassProperty', key, value }),

	arrayExpression: elements => ({ type: 'ArrayExpression', elements }),
	callExpression: (callee, args) => ({ type: 'CallExpression', callee, arguments: args }),
	functionExpression: (id, params, body) => ({ type: 'FunctionExpression', id, params, body }),
	memberExpression: (object, property) => ({ type: 'MemberExpression', object, property }),
	expressionStatement: expression => ({ type: 'ExpressionStatement', expression }),
	taggedTemplateExpression: (tag, quasi) => ({ type: 'TaggedTemplateExpression', tag, quasi }),
	templateLiteral: (quasis, expressions) => ({ type: 'TemplateLiteral', quasis, expressions }),
	templateElement: (value, tail = false) => ({ type: 'TemplateElement', value, tail }),
	importDeclaration: (specifiers, source) => ({ type: 'ImportDeclaration', specifiers, source }),
	importSpecifier: (local, imported) => ({ type: 'ImportSpecifier', local, imported }),
	importDefaultSpecifier: local => ({ type: 'ImportDefaultSpecifier', local }),
	importNamespaceSpecifier: local => ({ type: 'ImportNamespaceSpecifier', local }),
	assignmentExpression: (operator, left, right) => ({ type: 'AssignmentExpression', operator, left, right }),
	variableDeclaration: (kind, declarations) => ({ type: 'VariableDeclaration', kind, declarations }),
	variableDeclarator: (id, init) => ({ type: 'VariableDeclarator', id, init }),
	JSXIdentifier: name => ({ type: 'JSXIdentifier', name }),
	JSXAttribute: (name, value) => ({ type: 'JSXAttribute', name, value }),
	/** @type {(a:Node,b:Node)=>boolean} */
	isNodesEquivalent(a, b) {
		if (a instanceof Path) a = a.node;
		if (b instanceof Path) b = b.node;
		if (a == b) return true;
		if (typeof a !== 'object' || typeof b !== 'object') return false;
		if (!a || !b || a.type !== b.type) return false;
		for (let i in a) {
			const bi = b[i];
			const ai = a[i];
			if (i[0] === '_' || ai === bi) continue;
			if (typeof ai !== typeof bi) return false;
			if (Array.isArray(ai)) {
				if (!Array.isArray(bi) || bi.length !== ai.length) return false;
				for (let x = 0; x < ai.length; x++) {
					if (TYPES.isNodesEquivalent(ai[x], bi[x]) === false) return false;
				}
			} else if (TYPES.isNodesEquivalent(ai, bi) === false) return false;
		}
	},
	/** @type {(a:Node,b?:Node)=>boolean} */
	isIdentifier(a, b) {
		if (a instanceof Path) a = a.node;
		if (!a || a.type !== 'Identifier') return false;
		return !b || TYPES.isNodesEquivalent(a, b);
	},
	react: {
		/**
		 * Note: we're optimizing for source parity and don't collapse whitespace.
		 * @param {Node} node
		 */
		buildChildren(node) {
			const children = [];
			for (let child of node.children) {
				if (child.type === 'JSXText') {
					let { value } = child;
					if (value !== '') {
						if (visitingCtx && visitingCtx.generatorOpts.compact) {
							// Newlines must be replaced with a space character, but only if
							// we're inside a text node
							//
							// <p>hello
							//    world</p>  -> <p>hello world</p>
							//
							// <p>
							//    hello world  -> <p>hello world</p>
							// </p>
							//
							// We can drop the whole matched string if it only contains
							// whitespace characters, because that means we're at the
							// beginning or at the end of the JSXText node
							if (/[^\s]/.test(value)) {
								value = value.replace(/(^\s*\n\s*|\s*\n\s*$)/g, '');
								value = value.replace(/\s*\n+\s*/g, ' ');
							} else {
								value = value.replace(/\s*\n+\s*/g, '');
							}
						}
						children.push(TYPES.stringLiteral(value));
					}
					continue;
				}
				if (child.type === 'JSXExpressionContainer') child = child.expression;
				if (child.type === 'JSXEmptyExpression') continue;
				children.push(child);
			}
			return children;
		}
	},
	isBlock(node) {
		return node.type === 'BlockStatement' || node.type === 'Program';
	}
};

/** @type {typeof TYPES & Record<string, (...any: any[]) => Partial<Node>> & Record<string, (expr: Path | Node) => boolean>} */
// @ts-ignore-next
const types = new Proxy(TYPES, {
	get(obj, key) {
		if (Object.prototype.hasOwnProperty.call(obj, key)) {
			return obj[key];
		}

		if (typeof key !== 'string') return;

		if (key.startsWith('is')) {
			// Handle { type: 'StringLiteral', value: any }
			let type = key.substring(2);
			// Handle { type:'Literal', value:'string' }
			let alt, typeCheck, m;
			if ((m = type.toLowerCase().match(/^string|num|boolean/g))) {
				alt = 'Literal';
				typeCheck = m[0].replace('num', 'number');
			}
			obj[key] = pathOrNode => {
				if (pathOrNode == null) return false;
				const node = pathOrNode instanceof Path ? pathOrNode.node : pathOrNode;
				if (node.type === type) return true;
				if (node.type === alt && typeof node.value === typeCheck) return true;
				return false;
			};
			return obj[key];
		}

		const type = key[0].toUpperCase() + key.substring(1);
		// @TODO this doesn't cover all cases well enough.
		// Ideally it would be nice to avoid inlined defs here.
		const prop = /Literal/.test(key) ? 'value' : 'expression';
		obj[key] = v => ({ type, [prop]: v });
		return obj[key];
	}
});

function clearPositionData(node) {
	if ('start' in node) node.start = node.end = null;

	for (let i in node) {
		const v = node[i];
		if (isNode(v)) {
			clearPositionData(v);
		} else if (Array.isArray(v)) {
			for (const child of v) {
				if (isNode(child)) {
					clearPositionData(child);
				}
			}
		}
	}
}

/** @type {(obj: any) => obj is Node} */
function isNode(obj) {
	return typeof obj === 'object' && obj != null && (obj instanceof Node || 'type' in obj);
}

let Node;

/** @type {ReturnType<typeof createContext>} */
let visitingCtx;

/**
 * @param {Node} root
 * @param {Record<string, Visitor>} visitors
 * @param {object} state
 * @this {{ ctx: ReturnType<typeof createContext> }}
 */
function visit(root, visitors, state) {
	const { ctx } = this;
	visitingCtx = ctx;

	const afters = [];

	// Check instanceof since that's fastest, but also account for POJO nodes.
	Node = root.constructor;

	/** @type {Scope} */
	let scope;

	function enter(node, ancestors, seededPath) {
		const path = seededPath || new ctx.Path(node, ancestors.slice());
		if (node === root) {
			scope = new Scope(path, null);
		}
		ancestors.push(node);

		let prevScope = scope;
		if (types.isFunctionDeclaration(node)) {
			scope = new Scope(path, scope);

			for (let i = 0; i < node.params.length; i++) {
				const param = node.params[i];
				if (types.isIdentifier(param)) {
					const paramPath = path.get(`params.${i}`);
					scope.bindings[param.name] = new Binding(paramPath);
				} else if (types.isObjectPattern(param)) {
					for (let j = 0; j < param.properties.length; j++) {
						const prop = param.properties[j];
						if (types.isIdentifier(prop.value)) {
							const propPath = path.get(`params.${i}`);
							scope.bindings[prop.value.name] = new Binding(propPath);
						} else if (types.isAssignmentPattern(prop.value)) {
							const propPath = path.get(`params.${i}`);
							scope.bindings[prop.value.left.name] = new Binding(propPath);
						}
					}
				} else if (types.isArrayPattern(param)) {
					for (let j = 0; j < param.elements.length; j++) {
						const el = param.elements[j];
						if (types.isIdentifier(el)) {
							const elPath = path.get(`params.${i}`);
							scope.bindings[el.name] = new Binding(elPath);
						} else if (types.isAssignmentPattern(el)) {
							const propPath = path.get(`params.${i}`);
							scope.bindings[el.left.name] = new Binding(propPath);
						}
					}
				}
			}
		} else if (types.isBlockStatement(node)) {
			scope = new Scope(path, scope);
		} else if (types.isVariableDeclarator(node)) {
			if (types.isIdentifier(node.id)) {
				const name = node.id.name;
				scope.bindings[name] = new Binding(path);
			} else if (types.isArrayPattern(node.id)) {
				// Example: `const [a, b] = foo();`
				node.id.elements.forEach(item => {
					if (!item) return;
					if (types.isIdentifier(item)) {
						const name = item.name;
						scope.bindings[name] = new Binding(path);
					}
				});
			}
		} else if (
			types.isImportSpecifier(node) ||
			types.isImportDefaultSpecifier(node) ||
			types.isImportNamespaceSpecifier(node)
		) {
			const name = node.local.name;
			scope.bindings[name] = new Binding(path);
		} else if (types.isProgram(node)) {
			scope = new Scope(path, null);
		}
		path._scope = scope;

		if (path.shouldStop) {
			return false;
		}

		if (path.shouldSkip) {
			return;
		}

		// Babel has dedicated literal nodes like `NumericLiteral`
		if (node.type === 'Literal' && !(node.type in visitors)) {
			if (typeof node.value === 'number') {
				node.type = 'NumericLiteral';
			} else if (typeof node.value === 'string') {
				node.type = 'StringLiteral';
			} else if (typeof node.value === 'boolean') {
				node.type = 'BooleanLiteral';
			} else if (node.value === null) {
				node.type = 'NullLiteral';
			}
		}

		if (node.type in visitors) {
			let visitor = visitors[node.type];
			if (typeof visitor === 'object') {
				if (visitor.exit) {
					afters.push([visitor.exit, node, state, ancestors]);
				}
				if (visitor.enter) {
					visitor.enter(path, state);
				}
			} else {
				visitor(path, state);
			}
			if (ctx.queue.has(path)) {
				// node was requeued, skip (but don't stop)
				ancestors.pop();
				return;
			}
			if (path.shouldStop) {
				ancestors.pop();
				return false;
			}

			scope = prevScope;
		}

		outer: for (let i in node) {
			const v = node[i];
			if (isNode(v)) {
				if (enter(v, ancestors) === false) break;
			} else if (Array.isArray(v)) {
				for (const child of v) {
					if (isNode(child)) {
						if (enter(child, ancestors) === false) break outer;
					}
				}
			}
		}
		ancestors.pop();
	}

	enter(root, []);

	const queue = ctx.queue.values();
	let item;
	while ((item = queue.next()) && !item.done) {
		const next = item.value;
		ctx.queue.delete(next);
		enter(next.node, next.ancestors.slice(), next);
	}

	let after;
	while ((after = afters.pop())) {
		const [visitor, node, state, ancestors] = after;
		const path = new ctx.Path(node, ancestors);
		visitor(path, state);
	}
}

/**
 * @param {object} options
 * @param {string} options.code
 * @param {MagicString} options.out
 * @param {string} [options.filename]
 * @param {typeof DEFAULTS['parse']} options.parse
 * @param {{ compact?: boolean, filename?: string }} options.generatorOpts
 */
function createContext({ code, out, parse, generatorOpts, filename }) {
	let isInitialParse = true;
	let comments = [];

	const ctx = {
		paths: new WeakMap(),
		/** @type {Set<Path>} */
		queue: new Set(),
		code,
		out,
		parse(code, opts) {
			if (isInitialParse) {
				opts = Object.assign({}, opts || {});
				let onComment = opts && opts.onComment;
				if (!Array.isArray(onComment)) {
					opts.onComment = [];
				}
				opts.onComment.push = function (comment) {
					comments.push(comment);
					if (typeof onComment === 'function') {
						onComment(
							comment.type === 'Block',
							comment.value,
							comment.start,
							comment.end,
							comment.loc && comment.loc.start,
							comment.loc && comment.loc.end
						);
					}
					return Array.prototype.push.call(this, comment);
				};
				opts.allowAwaitOutsideFunction = true;
				isInitialParse = false;
			}
			return parse(code, opts);
		},
		generatorOpts,
		types,
		visit,
		/** @type {ReturnType<typeof createTemplate> | null} */
		template: createTemplate(parse),
		Path,
		hub: {
			file: {
				ast: {
					// TODO: use acorn's `onComment()` hook
					comments
				},
				opts: {
					filename
				}
			}
		}
	};

	const bound = { ctx };

	ctx.visit = ctx.visit.bind(bound);

	// @ts-ignore
	ctx.Path = function (node, ancestors) {
		return new Path(node, ancestors, ctx);
	};

	return ctx;
}

const DEFAULTS = {
	/** A reference to `acorn.parse`
	 * @type {(code: string, opts?: any) => import('acorn').Node}
	 */
	parse() {
		throw Error('options.parse() is required');
	},

	/** @type {boolean|'inline'|'both'} */
	sourceMaps: false
};

/**
 * Implements Babel's `transform()` API on top of Acorn, including transforms, plugins and presets.
 * @param {string} code
 * @param {object} [options]
 * @param {any[]} [options.presets]
 * @param {any[]} [options.plugins]
 * @param {typeof DEFAULTS.parse} [options.parse]
 * @param {string} [options.filename]
 * @param {boolean} [options.ast = false]
 * @param {{ compact?: boolean }} [options.generatorOpts]
 * @param {typeof DEFAULTS.sourceMaps} [options.sourceMaps]
 * @param {string} [options.sourceFileName]
 */
export function transform(
	code,
	{ presets, plugins, parse, filename, ast, generatorOpts, sourceMaps, sourceFileName } = {}
) {
	parse = parse || DEFAULTS.parse;
	generatorOpts = generatorOpts || {};
	const out = new MagicString(code);
	const ctx = createContext({ code, out, parse, generatorOpts, filename });
	const { types, template, visit } = ctx;

	const allPlugins = [];
	resolvePreset({ presets, plugins }, allPlugins);

	/** @type {Record<string, ReturnType<typeof createMetaVisitor>>} */
	const visitors = {};

	for (let i = 0; i < allPlugins.length; i++) {
		const [id, options] = allPlugins[i];
		const stateId = Symbol();
		const plugin = typeof id === 'string' ? require(id) : id;
		const inst = plugin({ types, template }, options);
		for (let i in inst.visitor) {
			// Merged visitors are separated via a pipe symbol:
			// `'ArrowFunctionExpression|FunctionExpression'`
			if (/|/.test(i)) {
				const parts = i.split('|');
				for (let j = 0; j < parts.length; j++) {
					let visitor = visitors[parts[j]] || (visitors[parts[j]] = createMetaVisitor({ filename }));
					visitor.visitors.push({
						stateId,
						visitor: inst.visitor[i],
						opts: options
					});
				}
			} else {
				// Normal visitors can be called directly
				let visitor = visitors[i] || (visitors[i] = createMetaVisitor({ filename }));
				visitor.visitors.push({
					stateId,
					visitor: inst.visitor[i],
					opts: options
				});
			}
		}
	}

	// let start = Date.now();
	let parsed;
	try {
		parsed = ctx.parse(code);
	} catch (err) {
		throw Object.assign(Error(), buildError(err, code, filename));
	}

	// start = Date.now();
	visit(parsed, visitors, new Map());

	let map;
	function getSourceMap() {
		if (!map) {
			map = out.generateMap({
				includeContent: true,
				// Must be set for most source map verifiers to work
				source: sourceFileName || filename,
				file: posix.basename(sourceFileName || filename || '')
			});
		}
		return map;
	}

	if (sourceMaps === 'inline' || sourceMaps === 'both') {
		code += '\n//# sourceMappingURL=' + getSourceMap().toUrl();
	}

	return {
		code: out.toString(),
		get ast() {
			return ast === true ? parsed : undefined;
		},
		get map() {
			return sourceMaps !== 'inline' && sourceMaps !== false ? getSourceMap() : undefined;
		}
	};
}

/**
 * @param {Error & { loc?: { line: number, column: number }}} err
 * @param {string} code
 * @param {string} [filename]
 * @returns {{ loc?: number | {line: number, column: number}, message: string, codeFrame?: string }}
 */
function buildError(err, code, filename = 'unknown') {
	const { loc, message } = err;
	if (!loc) return { message };
	const text = message.replace(/ \(\d+:\d+\)$/, '');
	const position = `${filename}:${loc.line}:${loc.column + 1}`;
	return {
		loc,
		message: `${text} (${position})`,
		codeFrame: codeFrame(code, loc)
	};
}

/**
 * An internal visitor that calls other visitors.
 * @param {object} options
 * @param {string} [options.filename]
 * @returns {Visitor & { visitors: ({ stateId: symbol, visitor: Visitor, opts?: any })[] }}
 */
function createMetaVisitor({ filename }) {
	function getPluginState(state, v) {
		let pluginState = state.get(v.stateId);
		if (!pluginState) {
			pluginState = new Map();
			pluginState.opts = v.opts || {};
			pluginState.filename = filename;
			state.set(v.stateId, pluginState);
		}
		return pluginState;
	}
	function enter(path, state) {
		for (const v of visitor.visitors) {
			const pluginState = getPluginState(state, v);
			const enter = typeof v.visitor === 'object' ? v.visitor.enter : v.visitor;
			if (enter) {
				enter(path, pluginState);
			}
		}
	}
	function exit(path, state) {
		for (const v of visitor.visitors) {
			const pluginState = getPluginState(state, v);
			const exit = v.visitor && v.visitor.exit;
			if (exit) {
				exit(path, pluginState);
			}
		}
	}
	const visitor = {
		visitors: [],
		enter: undefined,
		exit: undefined
	};
	visitor.visitors.push = function () {
		const r = Array.prototype.push.apply(this, arguments);
		for (let i = this.length; (!visitor.enter || !visitor.exit) && i--; ) {
			const v = this[i].visitor;
			if (typeof v === 'object') {
				if (v.enter) visitor.enter = enter;
				if (v.exit) visitor.exit = exit;
			} else visitor.enter = enter;
		}
		return r;
	};
	return visitor;
}

function resolvePreset(preset, normalizedPlugins, seen = new Set()) {
	let options;
	if (Array.isArray(preset)) {
		options = preset[1];
		preset = preset[0];
	}
	if (seen.has('^' + preset)) return;
	seen.add('^' + preset);
	if (typeof preset === 'function') {
		preset = preset(options || {}); // todo: options format?
	}
	let plugins = [];
	if (preset.presets) {
		for (const p of preset.presets) {
			resolvePreset(p, normalizedPlugins, seen);
		}
	}
	if (preset.plugins) {
		for (const plugin of preset.plugins) {
			let name = plugin,
				options;
			if (Array.isArray(plugin)) {
				[name, options] = plugin;
			}
			if (seen.has(name)) continue;
			seen.add(name);
			normalizedPlugins.push([name, options]);
		}
	}
	return plugins;
}
