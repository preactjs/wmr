import { defineConfig } from 'wmr';

export default defineConfig(async options => {
	return {
		plugins: [{ name: 'foo' }]
	};
});
