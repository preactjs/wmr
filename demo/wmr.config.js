import middleware from './plugins/ssr/middleware.js';

export default options => {
	options.middleware.push(middleware(options));
};
