import * as acornWalk from 'acorn-walk';
import * as jsxWalk from 'acorn-jsx-walk';
import MagicString from 'magic-string';

/**
 * @fileoverview
 * This is an attempt to implement Babel's APIs on top of Acorn.
 * You're probably looking for transform().
 */

const cjsDefault = m => ('default' in m ? m.default : m);

const walk = cjsDefault(acornWalk);
cjsDefault(jsxWalk).extend(walk.base);

/**
 * @typedef Node
 * @type {Omit<import('acorn').Node, 'start'|'end'> & { start?: number, end?: number, value?: any, selfClosing?: boolean, name?: any, computed?: boolean, condition?: Node, expression?: Node, expressions?: Node[], id?: Node, init?: Node, block?: Node, object?: Node, property?: Node, body?: Node[], tag?: Node, quasi?: Node, quasis?: Node[], declarators?: Node[], properties?: Node[], children?: Node[], elements?: Node[], key?: Node, shorthand?: boolean, method?: boolean, imported?: Node, local?: Node, specifiers?: Node[], source?: Node }}
 */

/**
 * @typedef State
 * @type {Map & { opts: object } & Record<any, any>}
 */

/**
 * @typedef Visitor
 * @type {(path: Path, state: State) => void}
 */

/**
 * @typedef PluginContext
 * @type {{ name: string, visitor: Record<string, Visitor | { enter?: Visitor, exit?: Visitor }> }}
 */

/**
 * @typedef Plugin
 * @type {(api: { types: typeof types, template: typeof template }) => PluginContext}
 */

/**
 * @param {Node} node
 * @param {ReturnType<createContext>} [ctx]
 */
export function generate(node, ctx) {
	codegenContext = ctx;
	return codegen(node);
}

/** @type {ReturnType<createContext>} */
let codegenContext;

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
			return ctx.out.slice(node.start, node.end).replace(/;([\s\n]*)/g, '$1');
		} catch (e) {}
	}

	// if (skipWs !== true) {
	// 	getSpacing(ctx, node);
	// 	if (node._spaceBefore || node._spaceAfter) {
	// 		return `${node._spaceBefore || ''}${codegen(node, true)}${node._spaceAfter || ''}`;
	// 	}
	// }

	// if (skipWs !== true && (node._spaceBefore || node._spaceAfter)) {
	// 	return `${node._spaceBefore || ''}${codegen(node, true)}${node._spaceAfter || ''}`;
	// }

	// if (ctx && skipWs !== true) {
	// 	let before = '',
	// 		after = '',
	// 		source,
	// 		m;
	// 	// const source = ctx.code.substring(node.start, node.end);
	// 	// m = source.match(/^([\s\n]*)[\s\S]*?([\s\n]*)$/);
	// 	// if (m) {
	// 	// 	before = m[1];
	// 	// 	after = m[2];
	// 	// 	return `${before}${codegen(node, true)}${after}`;
	// 	// }
	// 	source = ctx.code.substring(0, node.start);
	// 	m = source.match(/[\s\n]+$/g);
	// 	if (m) before = m[0];
	// 	source = ctx.code.substring(node.end);
	// 	m = source.match(/^[\s\n]+/g);
	// 	if (m) after = m[0];
	// 	if (before || after) {
	// 		return `${before}${codegen(node, true)}${after}`;
	// 	}
	// }

	switch (node.type) {
		case 'Expression':
		case 'ExpressionStatement':
			return codegen(node.expression);
		case 'SequenceExpression':
			return node.expressions.map(codegenParens).join(',');
		case 'IfStatement':
			return `if(${codegen(node.condition)})${codegen(node.block)}`;
		case 'Program':
			return node.body.map(codegen).join(';\n');
		case 'BlockStatement':
			return `{${node.body.map(codegen).join(';\n')}}`;
		case 'MemberExpression':
			if (node.computed) return codegen(node.object) + '[' + codegen(node.property) + ']';
			return codegen(node.object) + '.' + codegen(node.property);
		case 'ArrayExpression':
		case 'ArrayPattern':
			return `{${node.elements.map(codegen).join(',')}}`;
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
			return `${codegenParens(node.left)}${node.operator}${codegenParens(node.right)}`;
		case 'UnaryExpression':
			return `${node.operator}${codegenParens(node.argument)}`;
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
					console.log('expression: ', { [expressions[i].type]: expressions[i] });
					out += '${' + codegen(expressions[i]) + '}';
				}
			}
			return out + '`';
		}
		case 'VariableDeclaration':
			return node.type + ' ' + node.declarators.map(codegen).join(',');
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

function template(str) {
	str = String(str);
	return replacements => template.ast(str.replace(/[A-Z0-9]+/g, s => codegen(replacements[s])));
}
template.ast = function (str, expressions) {
	if (Array.isArray(str)) {
		str = str.reduce((str, q, i) => str + q + (i === expressions.length ? '' : expressions[i]), '');
	}

	/** @type {ReturnType<createContext>} */
	// @ts-ignore-next
	const ctx = this.ctx;

	if (!ctx) throw Error('template.ast() called without a parsing context.');

	return ctx.parse(str, { expression: true });
};

// keep things clean by making some properties non-enumerable
function def(obj, key, value) {
	Object.defineProperty(obj, key, { value });
}

// function preserveSpacing(ctx, str, start, end) {
// 	let before = '',
// 		after = '';
// 	if (start != null) {
// 		const m = ctx.code.substring(0, start).match(/[\s\n]+$/g);
// 		if (m) before = m[0];
// 	}
// 	if (end != null) {
// 		const m = ctx.code.substring(end).match(/^[\s\n]+/g);
// 		if (m) after = m[0];
// 	}
// 	if (!before && !after) return str;
// 	return before + str + after;
// }

// function getSpacing(ctx, node) {
// 	if (!('_spaceBefore' in node) && !('_spaceAfter' in node)) {
// 		let before, after;
// 		if (node.start != null) {
// 			const m = ctx.code.substring(0, node.start).match(/[\s\n]+$/g);
// 			if (m) before = m[0];
// 		}
// 		if (node.end != null) {
// 			const m = ctx.code.substring(node.end).match(/^[\s\n]+/g);
// 			if (m) after = m[0];
// 		}
// 		node._spaceBefore = before;
// 		node._spaceAfter = after;
// 	}
// }

class Path {
	/**
	 * @param {Node} node
	 * @param {Node[]} ancestors
	 * @param {ReturnType<createContext>} [ctx]
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

			// getSpacing(ctx, node);
			// if (!('_spaceBefore' in node) && !('_spaceAfter' in node)) {
			// 	if (node.start != null) {
			// 		const m = ctx.code.substring(0, node.start).match(/[\s\n]+$/g);
			// 		if (m) node._spaceBefore = m[0];
			// 	}
			// 	if (node.end != null) {
			// 		const m = ctx.code.substring(node.end).match(/^[\s\n]+/g);
			// 		if (m) node._spaceAfter = m[0];
			// 	}
			// }
		}
	}

	get parentPath() {
		const ancestors = this.ancestors.slice();
		const parent = ancestors.pop();
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

	// @TODO siblings

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
			if (!Array.isArray(node)) {
				ancestors.push(prev);
			}
		}
		return new Path(node, ancestors, this.ctx);
	}

	/** @param {Path | Node} node */
	replaceWith(node) {
		if (node instanceof Path) node = node.node;

		// const { start, end } = this.node;

		// to check: need to generate the string *first* so that we don't use .start/.end bypass?

		// if (!('_spaceBefore' in this.node)) {
		// 	getSpacing(this.ctx, this.node);
		// 	node._spaceBefore = this.node._spaceBefore;
		// 	node._spaceAfter = this.node._spaceAfter;
		// }
		this.node = node;
		if (this.inList) this.parent[this.listKey][this.key] = node;
		else this.parent[this.parentKey] = node;
		this.ctx.paths.set(node, this);

		if (this._regenerateParent()) {
			// node.start = this.node.start;
			// node.end = this.node.end;
			this._hasString = false;
		} else {
			// node._string = null;
			let str = generate(node, this.ctx);
			// node.start = this.node.start;
			// node.end = this.node.end;
			this._hasString = true;
			// this.ctx.out.overwrite(this.start, this.end, str);
			// str = preserveSpacing(this.ctx, str, this.start, this.end);
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
		// str = preserveSpacing(this.ctx, str, this.start, this.end);
		this.ctx.out.overwrite(this.start, this.end, str);
		// this.ctx.out.overwrite(this.node.start, this.node.end, str);
		// can't requeue if we didn't parse...
		// this._requeue();
	}

	remove() {
		this.replaceWithString('');
	}

	/** @param {string} str */
	prependString(str) {
		// this.ctx.mods.push(['appendLeft', this.node.start, str]);
		// this.ctx.out.appendLeft(this.node.start, str);
		this.ctx.out.appendLeft(this.start, str);
	}

	/** @param {string} str */
	appendString(str) {
		// this.ctx.mods.push(['appendRight', this.node.end, str]);
		// this.ctx.out.appendRight(this.node.end, str);
		this.ctx.out.appendRight(this.end, str);
	}

	_regenerate() {
		const { start, end } = this.node;
		this.node.start = this.node.end = this.node._string = null;
		let str = generate(this.node, this.ctx);
		this.node.start = start;
		this.node.end = end;
		// str = preserveSpacing(this.ctx, str, start, end);
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
		return this.ctx.out.slice(this.node.start, this.node.end);
	}
	getSource() {
		return this.ctx.code.substring(this.node.start, this.node.end);
	}
	unshiftContainer(property, node) {
		this.node[property].unshift(node);
		if (!this._regenerateParent()) {
			this._regenerate();
		}
		// this.get(property).prependString(generate(node, this.ctx));
	}
	pushContainer(property, node) {
		this.node[property].push(node);
		if (!this._regenerateParent()) {
			this._regenerate();
		}
		// this.get(property).appendString(generate(node, this.ctx));
	}
	_requeue() {
		this.ctx.queue.add(this);
	}
}

const TYPES = {
	identifier: name => ({ type: 'Identifier', name }),
	stringLiteral: value => ({ type: 'StringLiteral', value }),
	booleanLiteral: value => ({ type: 'BooleanLiteral', value }),
	numericLiteral: value => ({ type: 'NumericLiteral', value }),
	memberExpression: (object, property) => ({ type: 'MemberExpression', object, property }),
	expressionStatement: expression => ({ type: 'ExpressionStatement', expression }),
	taggedTemplateExpression: (tag, quasi) => ({ type: 'TaggedTemplateExpression', tag, quasi }),
	templateLiteral: (quasis, expressions) => ({ type: 'TemplateLiteral', quasis, expressions }),
	templateElement: (value, tail = false) => ({ type: 'TemplateElement', value, tail }),
	importDeclaration: (specifiers, source) => ({ type: 'ImportDeclaration', specifiers, source }),
	importSpecifier: (local, imported) => ({ type: 'ImportSpecifier', local, imported }),
	importDefaultSpecifier: local => ({ type: 'ImportDefaultSpecifier', local }),
	/** @type {(a:Node,b:Node)=>boolean} */
	isNodesEquivalent(a, b) {
		if (a instanceof Path) a = a.node;
		if (b instanceof Path) b = b.node;
		return a && b && a.type === b.type && a.name === b.name && a.value === b.value;
	},
	/** @type {(a:Node,b?:Node)=>boolean} */
	isIdentifier(a, b) {
		if (a instanceof Path) a = a.node;
		if (a.type !== 'Identifier') return false;
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
					const { value } = child;
					if (value !== '') {
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
		// @TODO fixme (would be nice to avoid inlined defs here)
		const prop = /Literal/.test(key) ? 'value' : 'expression';
		obj[key] = v => ({ type, [prop]: v });
		return obj[key];
	}
});

/** @this {{ ctx: ReturnType<createContext> }} */
function visit(root, visitors, state) {
	const { ctx } = this;
	const afters = [];

	function enter(node, ancestors, seededPath) {
		const path = seededPath || new ctx.Path(node, ancestors.slice());

		if (path.shouldStop) {
			return false;
		}

		if (path.shouldSkip) {
			return;
		}

		if (node.type in visitors) {
			let visitor = visitors[node.type];
			if (typeof visitor === 'object' && ('enter' in visitor || 'exit' in visitor)) {
				if (visitor.exit) {
					afters.push([visitor.exit, node, state, ancestors]);
				}
				visitor = visitor.enter;
			}
			if (visitor) {
				visitor(path, state);
			}
			if (ctx.queue.has(path)) {
				// console.log(path.node.type, 'requeued, stopping');
				return false;
			}
			if (path.shouldStop) {
				return false;
			}
		}

		ancestors.push(node);
		outer: for (let i in node) {
			const v = node[i];
			if (typeof v !== 'object' || v == null) {
			} else if (Array.isArray(v)) {
				for (const child of v) {
					if (enter(child, ancestors) === false) break outer;
				}
			} else if (enter(v, ancestors) === false) break;
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

	// let mod;
	// while ((mod = ctx.mods.pop())) {
	// for (let i = 0; i < ctx.mods.length; i++) {
	// 	const [fn, ...args] = ctx.mods[i];
	// 	if (fn === 'overwrite') {
	// 		const start = args[0];
	// 		const end = typeof args[1] === 'number' ? args[1] : args[0];
	// 		let firstEnd = end;
	// 		let firstStart = start;
	// 		for (let j = 0; j < ctx.mods.length; j++) {
	// 			const pstart = args[0];
	// 			const pend = typeof args[1] === 'number' ? args[1] : args[0];

	// 			if (pstart > start && pstart < firstEnd) {
	// 				firstEnd = pstart;
	// 			}

	// 			if (pend < end && pend > firstStart) {
	// 				firstStart = pend;
	// 			}
	// 		}
	// 		ctx.out.overwrite(start, firstEnd, 'before content');
	// 		ctx.out.overwrite(firstStart, end, 'after content');
	// 	}
	// 	// console.log(fn, ...args);
	// 	ctx.out[fn].apply(ctx.out, args);
	// }

	let after;
	while ((after = afters.pop())) {
		const [visitor, node, state, ancestors] = after;
		const path = new ctx.Path(node, ancestors);
		visitor(path, state);
	}
}

// /** @typedef {{ [K in keyof MagicString]: MagicString[K] extends Function ? K : never }[keyof MagicString]} MagicStringFunctions */

/**
 * @param {object} options
 * @param {string} options.code
 * @param {MagicString} options.out
 * @param {typeof DEFAULTS['parse']} options.parse
 */
function createContext({ code, out, parse }) {
	const ctx = {
		paths: new WeakMap(),
		/** @type {Set<Path>} */
		queue: new Set(),
		// /** @type {[MagicStringFunctions, ...Parameters<MagicStringFunctions>][]} */
		// mods: [],
		code,
		out,
		parse,
		types,
		visit,
		template,
		// visit: visit.bind(bound),
		// template: template.bind(bound),
		Path
		// Path(node, ancestors) {
		// 	return new Path(node, ancestors, ctx);
		// }
	};

	const bound = { ctx };

	ctx.visit = ctx.visit.bind(bound);

	ctx.template = template.bind(bound);
	ctx.template.ast = template.ast.bind(bound);

	// @ts-ignore
	ctx.Path = function (node, ancestors) {
		return new Path(node, ancestors, ctx);
	};

	// ctx.Path = class extends Path {
	// 	constructor(node, accessors) {
	// 		super(node, accessors, ctx);
	// 	}
	// };
	// ctx.Path.prototype.ctx = ctx;

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
 * @param {typeof DEFAULTS.sourceMaps} [options.sourceMaps]
 * @param {string} [options.sourceFileName]
 */
export function transform(code, { presets, plugins, parse, filename, ast, sourceMaps, sourceFileName } = {}) {
	parse = parse || DEFAULTS.parse;
	const out = new MagicString(code);
	const { types, template, visit } = createContext({ code, out, parse });

	const allPlugins = [];
	resolvePreset({ presets, plugins }, allPlugins);

	const visitors = {};

	for (let i = 0; i < allPlugins.length; i++) {
		const [id, options] = allPlugins[i];
		const stateId = Symbol();
		const plugin = typeof id === 'string' ? require(id) : id;
		const inst = plugin({ types, template }, options);
		for (let i in inst.visitor) {
			const visitor = visitors[i] || (visitors[i] = createMetaVisitor());
			visitor.visitors.push({
				stateId,
				visitor: inst.visitor[i],
				opts: options
			});
		}
	}

	// let start = Date.now();
	let parsed;
	try {
		parsed = parse(code);
	} catch (err) {
		throw Error(buildError(err, code, filename));
	}
	// console.log(`parse(${filename}): ${Date.now()-start}`);

	// start = Date.now();
	visit(parsed, visitors, new Map());
	// console.log(`visit(${filename}): ${Date.now()-start}`);

	let map;
	function getSourceMap() {
		if (!map) {
			map = out.generateMap({
				includeContent: false,
				source: sourceFileName
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

function buildError(err, code, filename) {
	const { loc, message } = err;
	if (!loc) return message;
	const text = message.replace(/ \(\d+:\d+\)$/, '');
	const position = `${filename}:${loc.line}:${loc.column + 1}`;
	const frame = codeFrame(code, loc);
	return `${text} (${position})${frame}`;
}

const normalize = str => str.replace(/^(\t+)/, (_, p1) => '  '.repeat(p1.length));

function codeFrame(code, loc) {
	const { line, column } = loc;
	const lines = code.split('\n');
	const len = String(line).length + 2;
	const pad = str => String(str).padStart(len);
	let frame = '';
	if (line > 1) {
		frame += `\n${pad(line - 2)} | ${normalize(lines[line - 2])}`;
	}
	frame += `\n${pad(line - 1)} | ${normalize(lines[line - 1])}`;
	// Add tab count to marker offset, because tabs are converted to 2 spaces.
	const tabCount = (lines[line - 1].match(/^\t+/) || []).length;
	frame += `\n${'-'.repeat(len + 3 + column + tabCount)}^`;
	if (line < lines.length) {
		frame += `\n${pad(line)} | ${normalize(lines[line])}`;
	}
	return frame;
}

/** @returns {{ enter?(path: Path, state: State):void, exit?(path: Path, state: State):void }} */
function createMetaVisitor() {
	function getPluginState(state, v) {
		let pluginState = state.get(v.stateId);
		if (!pluginState) {
			pluginState = new Map();
			pluginState.opts = v.opts || {};
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
