import { relative } from 'path';
import * as kl from 'kolorist';
import { debug } from '../lib/output-utils.js';

/**
 * @param {object} [options]
 * @param {string} [options.root] for creating relative bundle paths
 * @param {boolean} [options.inline] Resolve bundle: imports to an inline module as a data URL.
 * @returns {import('rollup').Plugin}
 */
export default function bundlePlugin({ root = '.', inline } = {}) {
	const log = debug('bundle');
	return {
		name: 'bundle-plugin',
		async resolveId(id, importer) {
			if (!id.startsWith('bundle:')) return;
			const resolved = await this.resolve(id.slice(7), importer, { skipSelf: true });
			if (resolved) {
				if (inline) {
					const url = '/' + relative(root, resolved.id).replace(/^\./, '');
					log(`[inline] ${kl.dim(url)}`);
					return {
						id: `data:text/javascript,export default${encodeURIComponent(JSON.stringify(url))}`,
						external: true
					};
				}

				resolved.id = `\0bundle:${resolved.id}`;
			}
			return resolved;
		},
		async load(id) {
			if (!id.startsWith('\0bundle:')) return;
			id = id.slice(8);

			const fileId = this.emitFile({
				type: 'chunk',
				id
				// fileName: relative(root, id)
			});
			this.addWatchFile(id);
			return `export default import.meta.ROLLUP_FILE_URL_${fileId}`;
		}
	};
}
