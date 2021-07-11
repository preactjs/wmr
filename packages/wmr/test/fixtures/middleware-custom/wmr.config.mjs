export default {
	middleware: [
		(req, res, next) => {
			if (req.path === '/foo.js') {
				res.setHeader('Content-Type', 'application/javascript');
				res.end(`export const value = "it ";`);
				return;
			}

			next();
		}
	]
};
