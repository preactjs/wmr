import { dirname, resolve } from 'path';
import { debug, formatResolved } from '../lib/output-utils.js';

/**
 * Package.json "aliases" field: {"a":"b"}
 * @param {object} options
 * @param {Record<string,string>} options.aliases
 * @returns {import('rollup').Plugin}
 */
export default function aliasesPlugin({ aliases }) {
	const log = debug('aliases');
	let pkgFilename;
	return {
		name: 'aliases',
		async resolveId(id, importer) {
			if (typeof id !== 'string' || id.match(/^(\0|\.\.?\/)/)) return;
			let aliased;
			for (let i in aliases) {
				if (id === i) {
					aliased = aliases[i];
					break;
				}
			}
			for (let i in aliases) {
				if (id.startsWith(i + '/')) {
					aliased = aliases[i] + id.substring(i.length);
					break;
				}
			}
			if (aliased == null) return;
			if (aliased.startsWith('./') || aliased.startsWith('../')) {
				aliased = resolve(dirname(pkgFilename), aliased);
			} else {
				aliased = resolve(aliased);
			}
			if (aliased === id) return;

			if (!aliased.startsWith(root)) {
				aliased = posix.join(`/@fs`, aliased);
			}
			// now allow other resolvers to handle the aliased version
			// (this is important since they may mark as external!)
			const resolved = await this.resolve(aliased, importer, { skipSelf: true });
			log(formatResolved(id, resolved, root));
			return resolved;
		}
	};
}
