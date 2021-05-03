export default function () {
	const ID = 'virtual-id';
	const ID2 = '@virtual-id';

	return {
		plugins: [
			{
				name: 'virtual-id-plugin',
				resolveId(id) {
					if (id === ID || id === ID2) {
						return id;
					}
				},
				load(id) {
					if (id === ID) {
						return `export const it = "it"`;
					} else if (id === ID2) {
						return `export const works = "works"`;
					}
				}
			}
		]
	};
}
