import { defineConfig } from 'wmr';

export default defineConfig(async options => {
	if (options.mode === 'start') {
		return {
			plugins: [{ name: 'start' }]
		};
	}
});
