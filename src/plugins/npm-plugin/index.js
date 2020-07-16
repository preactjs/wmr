import { posix, sep } from 'path';
import { memo } from './utils.js';
import { resolvePackageVersion, loadPackageFile } from './registry.js';
import { resolveModule } from './resolve.js';

/**
 * @param {Object} options
 * @param {string} [options.publicPath] URL path prefix to use for npm module scripts
 * @param {string} [options.prefix] Import prefix to use internally for representing npm modules
 * @param {boolean} [options.external] If `false`, resolved npm dependencies will be inlined by Rollup.
 * @returns {import('rollup').Plugin}
 */
export default function npmPlugin({ publicPath = '/@npm', prefix = '\bnpm/', external = true } = {}) {
	return {
		name: 'npm-plugin',
		async resolveId(id, importer) {
			importer =
				importer &&
				importer
					.replace(/^[A-Z]:/, '')
					.split(sep)
					.join('/');
			if (id.startsWith(publicPath)) return { id, external };

			if (id.startsWith(prefix)) id = id.substring(prefix.length);
			else if (/^(?:\0|[a-z]+:)/.test(id)) return;

			if (importer && importer.startsWith(prefix)) importer = importer.substring(prefix.length);

			// let module, path, version;
			/** @type {ReturnType <normalizeSpecifier>} */
			let meta;

			const importerMeta = importer && !isDiskPath(importer) && normalizeSpecifier(importer);

			// A relative import from within a module (resolve based on importer):
			if (isDiskPath(id)) {
				// not an npm module
				if (!importerMeta) return;

				meta = Object.assign({}, importerMeta);
				meta.path = posix.join(posix.dirname(meta.path || ''), id);
			} else {
				// An absolute, self or bare import
				meta = normalizeSpecifier(id);

				// Mark everything except self-imports as external: (eg: "preact/hooks" importing "preact")
				// Note: if `external=false` here, we're building a combined bundle and want to merge npm deps.
				if (external && importerMeta && meta.specifier !== importerMeta.specifier) {
					return { id: `${publicPath}/${id}`, external: true };
					// return { id, external: true };
					// return { id: `${prefix}${id}`, external: true };
				}
			}

			// Resolve @latest --> @10.4.1
			await resolvePackageVersion(meta);

			// Compute the final path
			// const resolvedPath = await resolveModule(meta);
			const { module, version, path } = meta;
			const readFile = (path = '') => loadPackageFile({ module, version, path });
			const hasFile = path =>
				readFile(path)
					.then(() => true)
					.catch(() => false);
			const resolvedPath = await resolveModule(path, { readFile, hasFile, module });

			return prefix + meta.module + '@' + meta.version + '/' + resolvedPath.replace(/^\//, '');
		},
		load(id) {
			// only load modules this plugin resolved
			if (!id.startsWith(prefix)) return;
			id = id.substring(prefix.length);

			const spec = normalizeSpecifier(id);
			return loadPackageFile(spec);
		}
	};
}

const PACKAGE_SPECIFIER = /^((?:@[\w.-]{1,200}\/)?[\w.-]{1,200})(?:@([a-z0-9^.~>=<-]{1,50}))?(?:\/(.*))?$/i;

export const normalizeSpecifier = memo(spec => {
	let [, module = '', version = '', path = ''] = spec.match(PACKAGE_SPECIFIER) || [];
	if (!module) throw Error(`Invalid specifier: ${spec}`);
	version = (version || 'latest').toLowerCase();
	module = module.toLowerCase();
	const specifier = module + (path ? '/' + path : '');
	return { module, version, path, specifier };
});

/** @param {string} filename */
function isDiskPath(filename) {
	// only check for windows paths if we're on windows
	if (sep === '\\' && /^(([A-Z]+:)?\\|\.\.?(\\|$))/.test(filename)) return true;
	return /^(file:\/\/)?([A-Z]:)?(\/|\.\.?(\/|$))/.test(filename);
}
