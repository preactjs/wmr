export default function foo() {
	return {
		async config() {
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
		}
	};
}
