import path from 'path';

/**
 * @param {object} options
 * @param {string} options.modDir
 * @param {Record<string, string>} options.browser
 * @returns {import('rollup').Plugin}
 */
export function browserFieldPlugin({ browser, modDir }) {
	/** @type {Map<string, string>} */
	const browserField = new Map();
	if (typeof browser === 'object') {
		for (const [spec, replacement] of Object.entries(browser)) {
			browserField.set(path.normalize(spec), path.join(modDir, replacement));
		}
	}

	return {
		name: 'browser-field',
		async resolveId(id, importer) {
			const resolved = await this.resolve(id, importer, { skipSelf: true });

			let spec = resolved ? resolved.id : id;

			if (/^\.?\.\//.test(spec)) {
				if (importer) {
					spec = path.relative(modDir, path.join(path.dirname(importer), spec));
				}
			} else if (path.isAbsolute(spec)) {
				spec = path.relative(modDir, spec);
			}

			const replacement = browserField.get(spec);
			if (replacement) {
				const resolved = await this.resolve(replacement, importer, { skipSelf: true });
				return resolved ? resolved.id : replacement;
			}
		}
	};
}
