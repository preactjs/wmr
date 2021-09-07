import { basename, relative } from 'path';
import { promises as fs } from 'fs';
import * as kl from 'kolorist';
import { matchAlias } from '../lib/aliasing.js';
import { debug } from '../lib/output-utils.js';
import { pathToUrl } from '../lib/fs-utils.js';

export const IMPLICIT_URL = /\.(?:png|jpe?g|gif|webp|svg|mp4|webm|ogg|mp3|wav|flac|aac|woff2?|eot|ttf|otf)$/i;

const escapeUrl = url => url.replace(/#/g, '%23').replace(/'/g, "\\'").replace(/"/g, '\\"');

/**
 * @param {object} options
 * @param {object} [options.inline = false] Emit a Data URL module exporting the URL string.
 * @param {object} [options.root] Used to resolve the URL when `inline` is `true`.
 * @param {Record<string, string>} options.alias
 * @returns {import('rollup').Plugin}
 */
export default function urlPlugin({ inline, root, alias }) {
	const PREFIX = 'url:';
	const INTERNAL_PREFIX = '\0url:';

	const log = debug('wmr:url');

	return {
		name: 'url-plugin',
		async resolveId(id, importer) {
			if (!id.startsWith(PREFIX)) return;

			id = id.slice(PREFIX.length);

			const resolved = await this.resolve(id, importer, { skipSelf: true });
			if (!resolved) return;

			// In dev mode, we turn the import into an inline module that avoids a network request:
			if (inline) {
				const aliased = matchAlias(alias, resolved.id);
				const url = pathToUrl(aliased || '/' + relative(root, resolved.id)) + '?asset';
				log(`${kl.green('inline')} ${kl.dim(url)} <- ${kl.dim(resolved.id)}`);
				return {
					id: escapeUrl(`data:text/javascript,export default${JSON.stringify(url)}`),
					external: true
				};
			}
			resolved.id = `${INTERNAL_PREFIX}${resolved.id}`;
			return resolved;
		},
		async load(id) {
			if (!id.startsWith(INTERNAL_PREFIX)) return;

			id = id.slice(INTERNAL_PREFIX.length);

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
