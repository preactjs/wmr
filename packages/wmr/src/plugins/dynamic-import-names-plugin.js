/**
 * Output dynamic import chunks using the names of their source modules.
 * Example: import('./pages/index.js') produces a chunk name of "pages/index".
 * @returns {import('rollup').Plugin}
 */
export default function dynamicImportNamesPlugin({ prefix = '', suffix = '' } = {}) {
	return {
		name: 'dynamic-import-names',
		async resolveDynamicImport(source, importer) {
			// source can be an Acorn node, in which case we can't statically resolve this.
			if (typeof source !== 'string') return;

			// "./pages/about/index.js" --> "pages/about/index"
			const name = prefix + source.replace(/(^\.?\/|\.([cm]js|[tj]sx?)$)/gi, '') + suffix;
			const resolved = await this.resolve(source, importer);
			if (resolved) {
				const { id } = resolved;
				this.emitFile({ type: 'chunk', id, name });
				return id;
			}
		}
	};
}
