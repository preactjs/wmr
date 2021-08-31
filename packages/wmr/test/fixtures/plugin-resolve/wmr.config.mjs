export default function foo() {
	let resolved = '';
	return {
		plugins: [
			{
				name: 'resolve-id',
				resolveId(id) {
					if (/foo/.test(id)) {
						resolved = id;
						return id;
					}
				},
				load(id) {
					if (/foo/.test(id)) {
						return `export const value = ${JSON.stringify(resolved.replace('\0', ''))}`;
					}
				}
			}
		]
	};
}
