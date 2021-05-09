import { resolveAlias } from '../lib/aliasing.js';
import { debug, formatResolved } from '../lib/output-utils.js';

/**
 * Package.json "aliases" field: {"a":"b"}
 * @param {object} options
 * @param {Record<string,string>} options.aliases
 * @returns {import('rollup').Plugin}
 */
export default function aliasesPlugin({ aliases }) {
	const log = debug('aliases');

	return {
		name: 'aliases',
		async resolveId(id, importer) {
			if (typeof id !== 'string' || id.match(/^(\0|\.\.?\/)/)) return;
			const aliased = resolveAlias(aliases, id);
			if (aliased == null || aliased === id) return;

			// now allow other resolvers to handle the aliased version
			// (this is important since they may mark as external!)
			const resolved = await this.resolve(aliased, importer, { skipSelf: true });
			log(formatResolved(id, resolved));
			return resolved;
		}
	};
}
