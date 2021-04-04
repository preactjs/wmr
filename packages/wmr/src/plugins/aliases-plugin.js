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

			let aliased = null;
			let partial = null;
			for (let i in aliases) {
				// Find an exact match
				if (id === i) {
					aliased = aliases[i];
					break;
				}

				// Fall back to a partial match if any
				if (partial === null && id.startsWith(i + '/')) {
					partial = aliases[i] + id.substring(i.length);
					break;
				}
			}

			// We had no exact match, use partial one
			if (aliased === null && partial) {
				aliased = partial;
			}

			if (aliased == null || aliased === id) return;
			// now allow other resolvers to handle the aliased version
			// (this is important since they may mark as external!)
			const resolved = await this.resolve(aliased, importer, { skipSelf: true });
			log(formatResolved(id, resolved));
			return resolved;
		}
	};
}
