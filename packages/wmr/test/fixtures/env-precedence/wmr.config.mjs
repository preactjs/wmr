const settings = {
	env: {
		FOO: 'asdf'
	}
};
// API_URL from `.env` gets overwritten with `undefined`
export default options => {
	Object.assign(options.env, settings.env);
};
