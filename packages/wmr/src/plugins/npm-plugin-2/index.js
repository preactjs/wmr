import { builtinModules } from 'module';
import path from 'path';
import * as kl from 'kolorist';
import { isDirectory } from '../../lib/fs-utils.js';
import { debug } from '../../lib/output-utils.js';
import { npmBundle } from './npm-bundle.js';

const log = debug('npm-plugin-2');

/**
 * @param {object} options
 * @param {string} options.root
 * @returns {import('rollup').Plugin}
 */
export function npmPlugin2({ root }) {
	const builtins = new Set(builtinModules);

	const PREFIX = '\0npm:';

	// FIXME: Buffer for assets
	/** @type {Map<string, { code: string, map: any }>} */
	const chunkCache = new Map();

	return {
		name: 'npm-plugin-2',
		async resolveId(id, importer) {
			// Validate package name
			if (
				// Must not start with `._`
				/^[._/]/.test(id) ||
				// Must not match deny list
				/node_modules|favicon\.ico/.test(id) ||
				// Must not be a built-in node module
				builtins.has(id) ||
				// Must be lowercase
				id.toLowerCase() !== id ||
				// Must not contain special characters
				/[~'!()*;,?:@&=+$]/.test(id) ||
				// Must contain a second path segment if scoped
				(id[0] === '@' && id.indexOf('/') === -1)
			) {
				return;
			}

			return PREFIX + id;
		},
		async load(id) {
			if (!id.startsWith(PREFIX)) return;
			id = id.slice(PREFIX.length);

			// TODO: Caching

			// Extract package name from id:
			//   foo -> foo
			//   foo/bar.css -> foo
			//   @foo/bar.css -> @foo/bar.css
			//   @foo/bar/bob.css -> @foo/bar
			let pkgName = id;
			const first = id.indexOf('/');
			if (id[0] === '@') {
				const second = id.indexOf('/', first);
				pkgName = second > -1 ? id.slice(0, second) : id;
			} else {
				pkgName = first > 0 ? id.slice(0, first) : id;
			}

			let modDir = '';
			// There may be multiple `node_modules` directories at play
			// with monorepo setups.
			try {
				let dir = root;

				let lastDir = root;
				// eslint-disable-next-line no-constant-condition
				while (true) {
					const maybe = path.join(dir, 'node_modules', pkgName);
					log(kl.dim(`trying ${maybe}`));
					if (await isDirectory(maybe)) {
						modDir = maybe;
						break;
					}

					lastDir = dir;
					dir = path.dirname(dir);
					if (lastDir === dir) {
						return;
					}
				}
			} catch (err) {
				log(err);
				return;
			}

			// We didn't found a module directory
			if (modDir === '') return;

			const result = await npmBundle(modDir, pkgName, id);

			result.output.forEach(chunkOrAsset => {
				if (chunkOrAsset.fileName === 'virtual-entry.js') {
					return;
				}

				// FIXME: assets
				if (chunkOrAsset.type === 'chunk') {
					const match = chunkOrAsset.fileName.match(/(.*)-[a-z0-9]+$/);
					if (!match) {
						throw new Error(`Unable to determine chunk from "${chunkOrAsset.fileName}" for package "${pkgName}"`);
					}
					const name = match[1];
					chunkCache.set(name, { code: chunkOrAsset.code, map: chunkOrAsset.map || null });
				}
			});

			const chunk = chunkCache.get(pkgName);
			if (!chunk) {
				throw new Error(`Compiled chunk for package "${pkgName}" not found.`);
			}

			return {
				code: chunk.code,
				map: chunk.map
			};
		}
	};
}
