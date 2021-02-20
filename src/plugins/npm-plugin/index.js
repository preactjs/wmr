import { posix, sep } from 'path';
import { memo } from './utils.js';
import { resolvePackageVersion, loadPackageFile, getPackageVersionFromDeps } from './registry.js';
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
			if (id[0] === '\0' || /^[\w-]+:/.test(id)) return;

			if (importer) {
				if (importer[0] === '\0') importer = '';

				// replace windows paths
				importer = importer
					.replace(/^[A-Z]:/, '')
					.split(sep)
					.join('/');
			}

			if (id.startsWith(publicPath)) return { id, external };

			if (id.startsWith(prefix)) id = id.substring(prefix.length);
			else if (/^(?:\0|[a-z]+:|\/)/.test(id)) return;

			if (importer && importer.startsWith(prefix)) importer = importer.substring(prefix.length);

			// let module, path, version;
			/** @type {ReturnType <normalizeSpecifier>} */
			let meta;

			const importerMeta = importer && !isDiskPath(importer) && normalizeSpecifier(importer);

			let isExternal = false;
			let isEntry = false;

			// A relative import from within a module (resolve based on importer):
			if (isDiskPath(id)) {
				// not an npm module
				if (!importerMeta) return;

				meta = Object.assign({}, importerMeta);
				meta.path = posix.join(posix.dirname(meta.path || ''), id);
			} else {
				// An absolute, self or bare import
				meta = normalizeSpecifier(id);

				// not imported by an npm module, or imported by a _different_ module
				if (!importerMeta || meta.specifier !== importerMeta.specifier) {
					isEntry = true;
				}

				if (external && importerMeta && meta.specifier !== importerMeta.specifier) {
					isExternal = true;
				}
			}

			// use package.json version range from importer:
			if (!meta.version && importerMeta) {
				try {
					const importerPkg = JSON.parse(
						await loadPackageFile({
							module: importerMeta.module,
							version: importerMeta.version,
							path: 'package.json'
						})
					);
					const contextualVersion = getPackageVersionFromDeps(importerPkg, meta.module);
					if (contextualVersion) {
						meta.version = contextualVersion;
					}
				} catch (e) {}
			}

			meta.version = meta.version || '';

			// Resolve @latest --> @10.4.1
			await resolvePackageVersion(meta);

			// Versions that resolve to the root are removed
			// (see "Option 3" in wmr-middleware.jsL247)
			let emitVersion = true;
			// if ((await resolvePackageVersion({ module: meta.module, version: '' })).version === meta.version) {
			// 	emitVersion = false;
			// 	// meta.version = '';
			// }

			// Mark everything except self-imports as external: (eg: "preact/hooks" importing "preact")
			// Note: if `external=false` here, we're building a combined bundle and want to merge npm deps.
			if (isExternal) {
				const versionTag = emitVersion && meta.version ? '@' + meta.version : '';
				id = `${meta.module}${versionTag}${meta.path ? '/' + meta.path : ''}`;

				return { id: `${publicPath}/${id}`, external: true };
			}

			// Compute the final path
			const { module, version, path } = meta;
			const readFile = (path = '') => loadPackageFile({ module, version, path });
			const hasFile = path =>
				readFile(path)
					.then(() => true)
					.catch(() => false);

			// If external=true, we're bundling a single module, so "no importer" means an entry
			// If external=false, we're bundling a whole app, so "different importer" means an entry
			const isInternalImport = external ? !!importer : !isEntry;
			let resolvedPath = await resolveModule(path, {
				readFile,
				hasFile,
				module,
				internal: isInternalImport
			});
			resolvedPath = resolvedPath.replace(/^\//, '');

			// CSS files are not handled by this plugin.
			if (/\.css$/.test(id) && (await hasFile(resolvedPath))) {
				return `${prefix}${meta.module}${emitVersion && meta.version ? '@' + meta.version : ''}/${resolvedPath}`;
				// return `./node_modules/${meta.module}${emitVersion && meta.version ? '@' + meta.version : ''}/${resolvedPath}`;
				// return `./node_modules/${meta.module}/${resolvedPath}`;
			}

			return `${prefix}${meta.module}${emitVersion && meta.version ? '@' + meta.version : ''}/${resolvedPath}`;
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
	version = (version || '').toLowerCase();
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
