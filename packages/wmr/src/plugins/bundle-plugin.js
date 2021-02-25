import { relative } from 'path';

/**
 * @param {object} [options]
 * @param {string} [options.cwd] for creating relative bundle paths
 * @param {boolean} [options.inline] Resolve bundle: imports to an inline module as a data URL.
 * @returns {import('rollup').Plugin}
 */
export default function bundlePlugin({ cwd = '.', inline } = {}) {
	return {
		name: 'bundle-plugin',
		async resolveId(id, importer) {
			if (!id.startsWith('bundle:')) return;
			const resolved = await this.resolve(id.slice(7), importer, { skipSelf: true });
			if (resolved) {
				if (inline) {
					const url = '/' + relative(cwd, resolved.id).replace(/^\./, '');
					return {
						id: `data:text/javascript,export default${JSON.stringify(url)}`.replace(/#/g, '%23'),
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
				// fileName: relative(cwd, id)
			});
			this.addWatchFile(id);
			return `export default import.meta.ROLLUP_FILE_URL_${fileId}`;
		}
	};
}
