export default function foo() {
	return [
		{
			name: 'plugin-a',
			async config(config) {
				console.log(`plugin-a: config() cwd: ${config.cwd}, root: ${config.root} }`);
			},
			configResolved(config) {
				console.log(`plugin-a: configResolved() { cwd: ${config.cwd}, root: ${config.root} }`);
			}
		}
	];
}
