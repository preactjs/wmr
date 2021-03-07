function hash(str) {
	let hash = 5381,
		i = str.length;
	while (i) {
		hash = (hash * 33) ^ str.charCodeAt(--i);
	}

	return (hash >>> 0).toString(36);
}

export default function transformPrefreshRegistrations({ types: t, template }, options = {}) {
	const refreshReg = t.identifier('$RefreshReg$');

	const registrationsByProgramPath = new Map();
	const seenForRegistration = new WeakSet();
	const seenForOutro = new WeakSet();

	const isComponentishName = name => typeof name === 'string' && name[0] >= 'A' && name[0] <= 'Z';
	let i = 0;
	function createRegistration(programPath, persistentID) {
		const handle = t.identifier(`_c${i++}`);
		if (!registrationsByProgramPath.has(programPath)) {
			registrationsByProgramPath.set(programPath, []);
		}

		const registrations = registrationsByProgramPath.get(programPath);
		registrations.push({
			handle,
			persistentID
		});

		return handle;
	}

	function findInnerComponents(inferredName, path, callback) {
		const node = path.node;
		switch (node.type) {
			case 'Identifier': {
				if (!isComponentishName(node.name)) {
					return false;
				}

				callback(inferredName, node, null);
				return true;
			}
			case 'FunctionDeclaration': {
				callback(inferredName, node.id, null);
				return true;
			}
			case 'ArrowFunctionExpression': {
				if (node.body.type === 'ArrowFunctionExpression') {
					return false;
				}

				callback(inferredName, node, path);
				return true;
			}
			case 'FunctionExpression': {
				callback(inferredName, node, path);
				return true;
			}
			case 'CallExpression': {
				const argsPath = path.get('arguments');
				if (argsPath === undefined || argsPath.length === 0) {
					return false;
				}

				const calleePath = path.get('callee');
				switch (calleePath.node.type) {
					case 'MemberExpression':
					case 'Identifier': {
						const calleeSource = calleePath.getSource();
						const firstArgPath = argsPath[0];
						const innerName = inferredName + '$' + calleeSource;
						const foundInside = findInnerComponents(innerName, firstArgPath, callback);
						if (!foundInside) {
							return false;
						}
						// const Foo = hoc1(hoc2(() => {}))
						// export default memo(React.forwardRef(function() {}))
						callback(inferredName, node, path);
						return true;
					}
					default: {
						return false;
					}
				}
			}
			case 'VariableDeclarator': {
				const init = node.init;
				if (init === null) {
					return false;
				}
				const name = node.id.name;
				if (!isComponentishName(name)) {
					return false;
				}
				switch (init.type) {
					case 'ArrowFunctionExpression':
					case 'FunctionExpression':
						// Likely component definitions.
						break;
					case 'CallExpression': {
						// Maybe a HOC.
						// Try to determine if this is some form of import.
						const callee = init.callee;
						const calleeType = callee.type;
						if (calleeType === 'Import') {
							return false;
						} else if (calleeType === 'Identifier') {
							if (callee.name.indexOf('require') === 0) {
								return false;
							} else if (callee.name.indexOf('import') === 0) {
								return false;
							}
							// Neither require nor import. Might be a HOC.
							// Pass through.
						} else if (calleeType === 'MemberExpression') {
							// Could be something like React.forwardRef(...)
							// Pass through.
						}
						break;
					}
					case 'TaggedTemplateExpression':
						// Maybe something like styled.div`...`
						break;
					default:
						return false;
				}
				const initPath = path.get('init');
				const foundInside = findInnerComponents(inferredName, initPath, callback);
				if (foundInside) {
					return true;
				}
				// TODO: See if this identifier is used in JSX. Then it's a component.
				const binding = path.scope.getBinding(name);
				if (binding === undefined) {
					return;
				}
				let isLikelyUsedAsType = false;
				const referencePaths = binding.referencePaths;
				for (let i = 0; i < referencePaths.length; i++) {
					const ref = referencePaths[i];
					if (ref.node && ref.node.type !== 'JSXIdentifier' && ref.node.type !== 'Identifier') {
						continue;
					}
					const refParent = ref.parent;
					if (refParent.type === 'JSXOpeningElement') {
						isLikelyUsedAsType = true;
					} else if (refParent.type === 'CallExpression') {
						const callee = refParent.callee;
						let fnName;
						switch (callee.type) {
							case 'Identifier':
								fnName = callee.name;
								break;
							case 'MemberExpression':
								fnName = callee.property.name;
								break;
						}
						switch (fnName) {
							case 'createElement':
							case 'jsx':
							case 'jsxDEV':
							case 'jsxs':
								isLikelyUsedAsType = true;
								break;
						}
					}
					if (isLikelyUsedAsType) {
						// const X = ... + later <X />
						callback(inferredName, init, initPath);
						return true;
					}
				}
			}
		}
		return false;
	}

	const createContextTemplate = template(
		`
    Object.assign((CREATECONTEXT.IDENT || (CREATECONTEXT.IDENT=CREATECONTEXT(VALUE))), {__:VALUE});
  `,
		{ placeholderPattern: /^[A-Z]+$/ }
	);

	const emptyTemplate = template(`
    (CREATECONTEXT.IDENT || (CREATECONTEXT.IDENT=CREATECONTEXT()));
	`);

	const getFirstNonTsExpression = expression =>
		expression.type === 'TSAsExpression' ? getFirstNonTsExpression(expression.expression) : expression;

	return {
		name: 'transform-prefresh-registrations',
		visitor: {
			ClassDeclaration: {
				enter(path) {
					const node = path.node;
					let programPath;
					let insertAfterPath;
					switch (path.parent.type) {
						case 'Program':
							insertAfterPath = path;
							programPath = path.parentPath;
							break;
						case 'ExportNamedDeclaration':
							insertAfterPath = path.parentPath;
							programPath = insertAfterPath.parentPath;
							break;
						case 'ExportDefaultDeclaration':
							insertAfterPath = path.parentPath;
							programPath = insertAfterPath.parentPath;
							break;
						default:
							return;
					}
					const id = node.id;
					if (id === null) {
						// We don't currently handle anonymous default exports.
						return;
					}
					const inferredName = id.name;
					if (!isComponentishName(inferredName)) {
						return;
					}

					// Make sure we're not mutating the same tree twice.
					// This can happen if another Babel plugin replaces parents.
					if (seenForRegistration.has(node)) {
						return;
					}
					seenForRegistration.add(node);
					// Don't mutate the tree above this point.

					const handle = createRegistration(programPath, inferredName);
					insertAfterPath.insertAfter(t.expressionStatement(t.assignmentExpression('=', handle, path.node.id)));
				}
			},
			CallExpression(path, state) {
				if (!path.get('callee').referencesImport('preact', 'createContext')) return;

				let id = '';
				if (t.isVariableDeclarator(path.parentPath)) {
					id += '$' + path.parent.id.name;
				} else if (t.isAssignmentExpression(path.parentPath)) {
					if (t.isIdentifier(path.parent.left)) {
						id += '_' + path.parent.left.name;
					} else {
						id += '_' + hash(path.parentPath.get('left').getSource());
					}
				}
				const contexts = state.get('contexts');
				let counter = (contexts.get(id) || -1) + 1;
				contexts.set(id, counter);
				if (counter) id += counter;
				id = '_' + state.get('filehash') + id;
				path.skip();
				if (path.node.arguments[0]) {
					path.replaceWith(
						createContextTemplate({
							CREATECONTEXT: path.get('callee').node,
							IDENT: t.identifier(id),
							VALUE: t.clone(getFirstNonTsExpression(path.node.arguments[0]))
						})
					);
				} else {
					path.replaceWith(
						emptyTemplate({
							CREATECONTEXT: path.get('callee').node,
							IDENT: t.identifier(id)
						})
					);
				}
			},
			ExportDefaultDeclaration(path) {
				const node = path.node;
				const decl = node.declaration;
				const declPath = path.get('declaration');
				if (decl.type !== 'CallExpression') {
					// For now, we only support possible HOC calls here.
					// Named function declarations are handled in FunctionDeclaration.
					// Anonymous direct exports like export default function() {}
					// are currently ignored.
					return;
				}

				// Make sure we're not mutating the same tree twice.
				// This can happen if another Babel plugin replaces parents.
				if (seenForRegistration.has(node)) {
					return;
				}
				seenForRegistration.add(node);
				// Don't mutate the tree above this point.

				// This code path handles nested cases like:
				// export default memo(() => {})
				// In those cases it is more plausible people will omit names
				// so they're worth handling despite possible false positives.
				// More importantly, it handles the named case:
				// export default memo(function Named() {})
				const inferredName = '%default%';
				const programPath = path.parentPath;
				findInnerComponents(inferredName, declPath, (persistentID, targetExpr, targetPath) => {
					if (targetPath === null) {
						// For case like:
						// export default hoc(Foo)
						// we don't want to wrap Foo inside the call.
						// Instead we assume it's registered at definition.
						return;
					}
					const handle = createRegistration(programPath, persistentID);
					targetPath.replaceWith(t.assignmentExpression('=', handle, targetExpr));
				});
			},
			FunctionDeclaration: {
				enter(path) {
					const node = path.node;
					let programPath;
					let insertAfterPath;
					switch (path.parent.type) {
						case 'Program':
							insertAfterPath = path;
							programPath = path.parentPath;
							break;
						case 'ExportNamedDeclaration':
							insertAfterPath = path.parentPath;
							programPath = insertAfterPath.parentPath;
							break;
						case 'ExportDefaultDeclaration':
							insertAfterPath = path.parentPath;
							programPath = insertAfterPath.parentPath;
							break;
						default:
							return;
					}
					const id = node.id;
					if (id === null) {
						// We don't currently handle anonymous default exports.
						return;
					}
					const inferredName = id.name;
					if (!isComponentishName(inferredName)) {
						return;
					}

					// Make sure we're not mutating the same tree twice.
					// This can happen if another Babel plugin replaces parents.
					if (seenForRegistration.has(node)) {
						return;
					}
					seenForRegistration.add(node);
					// Don't mutate the tree above this point.

					// export function Named() {}
					// function Named() {}
					findInnerComponents(inferredName, path, (persistentID, targetExpr) => {
						const handle = createRegistration(programPath, persistentID);
						insertAfterPath.insertAfter(t.expressionStatement(t.assignmentExpression('=', handle, targetExpr)));
					});
				}
			},
			VariableDeclaration(path) {
				const node = path.node;
				let programPath;
				let insertAfterPath;

				switch (path.parent.type) {
					case 'Program':
						insertAfterPath = path;
						programPath = path.parentPath;
						break;
					case 'ExportNamedDeclaration':
						insertAfterPath = path.parentPath;
						programPath = insertAfterPath.parentPath;
						break;
					case 'ExportDefaultDeclaration':
						insertAfterPath = path.parentPath;
						programPath = insertAfterPath.parentPath;
						break;
					default:
						return;
				}

				// Make sure we're not mutating the same tree twice.
				// This can happen if another Babel plugin replaces parents.
				if (seenForRegistration.has(node)) {
					return;
				}
				seenForRegistration.add(node);
				// Don't mutate the tree above this point.

				const declPaths = path.get('declarations');
				if (declPaths.length !== 1) {
					return;
				}

				const declPath = declPaths[0];
				const inferredName = declPath.node.id.name;
				findInnerComponents(inferredName, declPath, (persistentID, targetExpr, targetPath) => {
					if (targetPath === null) {
						return;
					}

					const handle = createRegistration(programPath, persistentID);
					if (targetPath.parent.type === 'VariableDeclarator') {
						insertAfterPath.insertAfter(t.expressionStatement(t.assignmentExpression('=', handle, declPath.node.id)));
					} else {
						targetPath.replaceWith(t.assignmentExpression('=', handle, targetExpr));
					}
				});
			},
			Program: {
				enter(path, state) {
					state.set('filehash', hash(path.ctx.filename || 'unnamed'));
					state.set('contexts', new Map());
				},
				exit(path) {
					const registrations = registrationsByProgramPath.get(path);

					if (registrations === undefined) {
						return;
					}

					// Make sure we're not mutating the same tree twice.
					// This can happen if another Babel plugin replaces parents.
					const node = path.node;
					if (seenForOutro.has(node)) {
						return;
					}
					seenForOutro.add(node);
					// Don't mutate the tree above this point.

					registrationsByProgramPath.delete(path);
					const declarators = [];
					path.pushContainer('body', t.variableDeclaration('var', declarators));
					registrations.forEach(({ handle, persistentID }) => {
						path.pushContainer(
							'body',
							t.expressionStatement(t.callExpression(refreshReg, [handle, t.stringLiteral(persistentID)]))
						);
						declarators.push(t.variableDeclarator(handle));
					});
				}
			}
		}
	};
}
