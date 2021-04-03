import * as path from 'path';

export default function config(config) {
	return {
		name: 'root-plugin',
		async resolveId(id) {
			if (!id.startsWith('~/')) return;

			const absolute = path.join(config.cwd, 'sub', id.substring(2)).replace(/\\/g, '/');
			return this.resolve(absolute);
		}
	};
}
