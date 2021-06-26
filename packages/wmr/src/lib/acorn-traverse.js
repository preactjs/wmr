import * as acornWalk from 'acorn-walk';
import * as jsxWalk from 'acorn-jsx-walk';
import MagicString from 'magic-string';
import * as astringLib from 'astring';
import { codeFrame } from './output-utils.js';

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

/** @type {ReturnType<createContext> | empty} */
let codegenContext;

/**
 * @param {Node} node
 * @param {ReturnType<createContext>} [ctx]
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

// Useful for debugging missing AST node serializers
// codeGenerator = new Proxy(codeGenerator, {
// 	get(target, key) {
// 		if (Reflect.has(target, key)) {
// 			return target[key];
// 		}
// 		throw Error(`No code generator defined for ${key}`);
// 	}
// });

function template(str) {
	str = String(str);
	return replacements => template.ast(str.replace(/[A-Z0-9]+/g, s => generate(replacements[s], codegenContext)));
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

		this.node = node;
		if (this.inList) this.parent[this.listKey][this.key] = node;
		else this.parent[this.parentKey] = node;
		this.ctx.paths.set(node, this);

		if (this._regenerateParent()) {
			this._hasString = false;
		} else {
			let str = generate(node, this.ctx);
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
		return clone;
	},
	identifier: name => ({ type: 'Identifier', name }),
	stringLiteral: value => ({ type: 'StringLiteral', value }),
	booleanLiteral: value => ({ type: 'BooleanLiteral', value }),
	numericLiteral: value => ({ type: 'NumericLiteral', value }),
	callExpression: (callee, args) => ({ type: 'CallExpression', callee, arguments: args }),
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
							const replacement = /[^\s]/.test(value) ? ' ' : '';
							value = value.replace(/\s*\n+\s*/g, replacement);
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

/** @type {ReturnType<createContext>} */
let visitingCtx;

/**
 * @param {Node} root
 * @param {Record<string, Visitor>} visitors
 * @param {object} state
 * @this {{ ctx: ReturnType<createContext> }}
 */
function visit(root, visitors, state) {
	const { ctx } = this;
	visitingCtx = ctx;

	const afters = [];

	// Check instanceof since that's fastest, but also account for POJO nodes.
	const Node = root.constructor;
	function isNode(obj) {
		return typeof obj === 'object' && obj != null && (obj instanceof Node || 'type' in obj);
	}

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
				return;
			}
			if (path.shouldStop) {
				return false;
			}
		}

		ancestors.push(node);
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
 * @param {typeof DEFAULTS['parse']} options.parse
 * @param {{ compact?: boolean }} options.generatorOpts
 */
function createContext({ code, out, parse, generatorOpts }) {
	const ctx = {
		paths: new WeakMap(),
		/** @type {Set<Path>} */
		queue: new Set(),
		code,
		out,
		parse,
		generatorOpts,
		types,
		visit,
		template,
		Path
	};

	const bound = { ctx };

	ctx.visit = ctx.visit.bind(bound);

	ctx.template = template.bind(bound);
	ctx.template.ast = template.ast.bind(bound);

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
	const { types, template, visit } = createContext({ code, out, parse, generatorOpts });

	const allPlugins = [];
	resolvePreset({ presets, plugins }, allPlugins);

	/** @type {Record<string, ReturnType<createMetaVisitor>>} */
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
				file: filename
			});

			map.sources = map.sources.filter(source => typeof source === 'string');
			// map.sourcesContent = map.sourcesContent.filter(source => typeof source === 'string');
			console.log('ACORN', map, sourceFileName, filename);
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
 * @returns {Visitor & { visitors: ({ stateId: symbol, visitor: Visitor, opts?: any })[] }}
 */
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
