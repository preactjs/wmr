function createPlugin(name, enforce) {
	const plugin = {
		name: `${name}-plugin`,
		transform(code, id) {
			if (id.endsWith('scripts.js')) {
				return `${code}\napp.textContent += ' ${name}';`;
			}
		}
	};

	// Test undefined behaviour
	if (enforce) {
		plugin.enforce = enforce;
	}

	return plugin;
}

export default function foo() {
	// The plugin order is intentionally wrong to test
	// that we sort them into the correct order
	return [
		createPlugin('pre1', 'pre'),
		createPlugin('post1', 'post'),
		createPlugin('normal1'),
		createPlugin('pre2', 'pre'),
		createPlugin('normal2', 'normal'),
		createPlugin('post2', 'post')
	];
}
