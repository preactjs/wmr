export default function foo() {
	return [
		{
			name: 'no-return',
			async config() {},
			configResolved() {}
		},
		{
			name: 'with-return',
			config() {
				return {
					middleware: [
						(req, res, next) => {
							if (req.url === '/test') {
								res.end('it works');
							} else {
								next();
							}
						}
					]
				};
			},
			configResolved() {
				return {
					middleware: [
						(req, res, next) => {
							if (req.url === '/test-resolved') {
								res.end('it works');
							} else {
								next();
							}
						}
					]
				};
			}
		}
	];
}
