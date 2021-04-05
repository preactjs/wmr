import { defineConfig } from 'wmr';

export default defineConfig(async options => {
	options.plugins.push({ name: 'foo' });
});
