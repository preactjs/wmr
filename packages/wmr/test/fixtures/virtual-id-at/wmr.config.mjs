export default function () {
	const ID = 'virtual:windi.css';
	const VIRTUAL_ID = '/@windicss/windi.css';

	return {
		plugins: [
			{
				name: 'virtual-id-plugin',
				resolveId(id) {
					if (id === ID) {
						return VIRTUAL_ID;
					}
				},
				load(id) {
					if (id === VIRTUAL_ID) {
						return `h1 { color: red; }`;
					}
				}
			}
		]
	};
}
