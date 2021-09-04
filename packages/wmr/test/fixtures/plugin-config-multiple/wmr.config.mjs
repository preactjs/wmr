export default function foo() {
	return [
		{
			name: 'A',
			config() {
				console.log('config() A');
			},
			configResolved() {
				console.log('configResolved() A');
			}
		},
		{
			name: 'B'
		},
		{
			name: 'C',
			async config() {
				console.log('config() C');
			},
			async configResolved() {
				console.log('configResolved() C');
			}
		}
	];
}
