import { posix } from 'path';
import { promises as fs } from 'fs';

/**
 * @param {object} [options]
 * @returns {import('rollup').Plugin}
 */
export default function urlPlugin(options = {}) {
	return {
		name: 'url-plugin',
		async resolveId(id, importer) {
			if (!id.startsWith('url:')) return;
			const resolved = await this.resolve(id.slice(4), importer);
			if (resolved) resolved.id = `url:${id}`;
			return resolved;
		},
		async load(id) {
			if (!id.startsWith('url:')) return;
			id = id.slice(4);

			const fileId = this.emitFile({ type: 'asset', name: posix.basename(id) });
			this.addWatchFile(id);
			fs.readFile(id).then(source => this.setAssetSource(fileId, source));
			return `export default import.meta.ROLLUP_FILE_URL_${fileId}`;
		}
	};
}
