import { promises as fs } from 'fs';
import { totalist } from 'totalist';

export default function cleanupPlugin() {
	return {
		name: 'cleanup',
		async writeBundle(options, bundle) {
			await totalist(options.dir, (rel, abs) => {
				if (rel in bundle) return;
				fs.unlink(abs).catch(String);
			});
		}
	};
}
