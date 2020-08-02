import { relative, basename } from 'path';
import { promises as fs } from 'fs';

/**
 * @param {object} [options]
 * @param {object} [options.inline = false] Emit a Data URL module exporting the URL string.
 * @param {object} [options.cwd] Used to resolve the URL when `inline` is `true`.
 * @returns {import('rollup').Plugin}
 */
export default function urlPlugin({ inline, cwd } = {}) {
	return {
		name: 'url-plugin',
		async resolveId(id, importer) {
			if (!id.startsWith('url:')) return;
			const resolved = await this.resolve(id.slice(4), importer);
			if (resolved) {
				// note: not currently used, might be worth removing.
				if (inline) {
					const url = relative(cwd, resolved.id).replace(/^\./, '');
					return { id: `data:text/javascript,export default${JSON.stringify(url)}`, external: true };
				}
				resolved.id = `\0url:${resolved.id}`;
			}
			return resolved;
		},
		async load(id) {
			if (!id.startsWith('\0url:')) return;
			id = id.slice(5);

			const fileId = this.emitFile({ type: 'asset', name: basename(id) });
			this.addWatchFile(id);
			fs.readFile(id).then(source => this.setAssetSource(fileId, source));
			return `export default import.meta.ROLLUP_FILE_URL_${fileId}`;
		}
	};
}
