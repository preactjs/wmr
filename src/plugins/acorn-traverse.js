import walk from 'acorn-walk';
import jsxWalk from 'acorn-jsx-walk';
import MagicString from 'magic-string';

// @ts-ignore
const jsxWalker = walk.base;
jsxWalk.extend(jsxWalker);

export function generate(node) {
	return codegen(node);
}

function codegen(node) {
	if (node == null) return '';
	switch (node.type) {
		case 'Expression':
			return codegen(node.expression);
		case 'SequenceExpression':
			return node.expressions.map(codegen).join(',');
		case 'IfStatement':
			return `if(${codegen(node.condition)})${codegen(node.block)}`;
		case 'BlockStatement':
			return `{${node.body.map(codegen).join(';')}}`;
		case 'MemberExpression':
			if (node.computed) return codegen(node.object) + '[' + codegen(node.property) + ']';
			return codegen(node.object) + '.' + codegen(node.property);
		case 'Identifier':
			return node.name;
		case 'NumberLiteral':
		case 'BooleanLiteral':
		case 'RegexpLiteral':
			return node.value;
		case 'StringLiteral':
			return `'${node.value.replace(/'/g, "\\'")}'`;
		case 'TaggedTemplate':
			return codegen(node.tag) + codegen(node.template);
		case 'TemplateLiteral':
			return '`' + node.quasis.reduce((s, q, i) => s + q.value.raw + codegen(node.expressions[i])) + '`';
		case 'VariableDeclaration':
			return node.type + ' ' + node.declarators.map(codegen).join(',');
		case 'VariableDeclarator':
			return codegen(node.id) + (node.init ? '=' + codegen(node.init) : '');
	}
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
	// @ts-ignore
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
	 * @param {import('acorn').Node} node
	 * @param {import('acorn').Node[]} ancestors
	 * @param {ReturnType<createContext>} ctx
	 */
	constructor(node, ancestors, ctx) {
		this.node = node;
		this.ancestors = ancestors;
		this.ctx = ctx;
		this.shouldStop = false;
		def(this, 'ancestors', ancestors);
		def(this, 'ctx', ctx);
		def(this, 'shouldStop', false);
		this.key = this.parentKey = null;
		const parent = this.parent;
		for (const key in parent) {
			if (parent[key] === node) {
				this.key = this.parentKey = key;
				break;
			}
		}
	}
	get parentPath() {
		const ancestors = this.ancestors.slice();
		const parent = ancestors.pop();
		return new Path(parent, ancestors, this.ctx);
	}
	get parent() {
		return this.ancestors[this.ancestors.length - 1];
	}
	forEach(callback) {
		const arr = Array.isArray(this.node) ? this.node : [this.node];
		arr.forEach(n => {
			callback(new Path(n, this.ancestors.slice(), this.ctx));
		});
	}
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
	replaceWith(node) {
		this.node = node;
		this.parent[this.parentKey] = this.node;
		this.replaceWithString(codegen(node));
	}
	replaceWithString(str) {
		this.ctx.out.overwrite(this.node.start, this.node.end, str);
	}
	prependString(str) {
		this.ctx.out.appendLeft(this.node.start, str);
	}
	appendString(str) {
		this.ctx.out.appendRight(this.node.end, str);
	}
	stop() {
		this.shouldStop = true;
	}
	getSource() {
		return this.ctx.code.substring(this.node.start, this.node.end);
	}
}
// def(Path.prototype, 'ancestors');
// def(Path.prototype, 'ctx');
// def(Path.prototype, 'shouldStop');

const types = new Proxy(
	{
		identifier: name => ({ type: 'Identifier', name }),
		stringLiteral: name => ({ type: 'StringLiteral', name }),
		booleanLiteral: name => ({ type: 'BooleanLiteral', name }),
		numericLiteral: name => ({ type: 'NumericLiteral', name }),
		expressionStatement: expression => ({ type: 'ExpressionStatement', expression })
	},
	{
		get(obj, key) {
			// @ts-ignore
			if (Reflect.hasOwnProperty(obj, key)) {
				return obj[key];
			}

			if (typeof key !== 'string') return;

			if (key.startsWith('is')) {
				const type = key.substring(2);
				obj[key] = pathOrNode => {
					if (pathOrNode == null) return false;
					const node = 'node' in pathOrNode ? pathOrNode.node : pathOrNode;
					return node.type === type;
				};
				return obj[key];
			}

			const type = key[0].toUpperCase() + key.substring(1);
			// @TODO fixme (would be nice to avoid inlined defs here)
			const prop = /Literal/.test(key) ? 'value' : 'expression';
			obj[key] = v => ({ type, [prop]: v });
			return obj[key];
		}
	}
);

function visit(root, visitors, state) {
	const { ctx } = this;
	const afters = [];
	walk.fullAncestor(
		root,
		(node, state, ancestors) => {
			ancestors = ancestors.slice(0, -1);
			if (node.type in visitors) {
				const path = new ctx.Path(node, ancestors);
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
				if (path.shouldStop) {
					return false;
				}
			}
		},
		jsxWalker,
		state
	);
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
 */
function createContext({ code, out, parse }) {
	const ctx = {
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

export function transform(code, { presets, plugins, parse, filename, ast, sourceMaps, sourceFileName } = DEFAULTS) {
	const out = new MagicString(code);
	const { types, template, visit } = createContext({ code, out, parse });

	const allPlugins = [];
	resolvePreset({ presets, plugins }, allPlugins);

	const visitors = {};

	for (let i = 0; i < allPlugins.length; i++) {
		const [id, options] = allPlugins[i];
		const stateId = Symbol();
		const plugin = typeof id === 'string' ? require(id) : id;
		const inst = plugin({ types, template });
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
	const text = message.replace(/ \(\d+:\d+\)$/, '');
	const position = `${filename}:${loc.line}:${loc.column + 1}`;
	const frame = codeFrame(code, loc);
	return `${text} (${position})${frame}`;
}

function codeFrame(code, loc) {
	const { line, column } = loc;
	const lines = code.split('\n');
	const len = String(line).length + 2;
	const pad = str => String(str).padStart(len);
	let frame = '';
	if (line > 1) {
		frame += `\n${pad(line - 2)} | ${lines[line - 2]}`;
	}
	frame += `\n${pad(line - 1)} | ${lines[line - 1]}`;
	frame += `\n${'-'.repeat(len + 2 + column)}^`;
	if (line < lines.length) {
		frame += `\n${pad(line)} | ${lines[line]}`;
	}
	return frame;
}

/**
 * @typedef State
 * @type {Map & { opts: object }}
 */

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
