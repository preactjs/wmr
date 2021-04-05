import { memo } from './utils.js';
import { bundleNpmModule } from '../../lib/npm-middleware.js';
import { createRequire } from 'module';

/**
 * @param {Object} options
 * @param {Record<string, string>} options.aliases
 * @param {boolean} [options.external] If `false`, resolved npm dependencies will be inlined by Rollup.
 * @param {string} [options.packageDir] Directory of the npm package (= same folder where the package's package.json lies)
 * @returns {import('rollup').Plugin}
 */
export default function npmPlugin({ aliases, packageDir }) {
	// TODO: Our prefix logic forces everything to have the leading \0.
	// Refactor this at some point in the future
	const INTERNAL_PREFIX = '\0npm:';

	return {
		name: 'npm-plugin',
		async resolveId(id) {
			// Check if we have a specifier that looks like an npm package.
			//
			// Valid specifiers:
			//   @foo/bar, foo, foo/bar.json
			//
			// Invalid specifiers:
			//   @foo, foo.json, ./foo, ../foo
			if (/^(@[\w-]+\/[\w-]+|[^:.]+(?:\/[\w-]+)*)$/.test(id)) {
				return INTERNAL_PREFIX + id;
			}
		},
		async load(id) {
			if (!id.startsWith(INTERNAL_PREFIX)) return;

			id = id.slice(INTERNAL_PREFIX.length);

			const code = await bundleNpmModule(id, {
				packageDir: packageDir || getNpmPackageDir(id),
				aliases
			});

			return code;
		}
	};
}

/**
 * Get the directory of an npm package
 * @param {string} id
 * @returns {string}
 */
export function getNpmPackageDir(id) {
	// This loads the CJS file, but we can get the package directory
	// from that.
	const require = createRequire(process.cwd());
	const cjsEntry = require.resolve(id);
	return cjsEntry.slice(0, cjsEntry.indexOf(id) + id.length);
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
