import { relative, basename, extname } from 'path';
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
			if (id[0] === '\0') return;

			if (!/\.(js|cjs|mjs|jsx|ts|tsx|html|json)$/.test(id) && !id.startsWith('url:') && extname(id)) {
				id = `url:${id}`;
			}
			if (!id.startsWith('url:')) return;
			const resolved = await this.resolve(id.slice(4), importer, { skipSelf: true });
			if (resolved) {
				// note: not currently used, might be worth removing.
				if (inline) {
					const url = '/' + relative(cwd, resolved.id).replace(/^\./, '') + '?asset';
					return {
						id: `data:text/javascript,export default${JSON.stringify(url)}`
							.replace(/#/g, '%23')
							.replace(/'/g, "\\'")
							.replace(/"/g, '\\"'),
						external: true
					};
				}
				resolved.id = `\0url:${resolved.id}`;
			}
			return resolved;
		},
		async load(id) {
			if (!id.startsWith('\0url:')) return;
			id = id.slice(5);

			const fileId = this.emitFile({
				type: 'asset',
				name: basename(id),
				source: await fs.readFile(id)
			});
			this.addWatchFile(id);
			return `export default import.meta.ROLLUP_FILE_URL_${fileId}`;
		}
	};
}
