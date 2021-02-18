import { dirname, resolve } from 'path';
import { promises as fs } from 'fs';

/**
 * Package.json "aliases" field: {"a":"b"}
 * @param {object} [options]
 * @param {Record<string,string>} [options.aliases] If omitted, obtained (and watched) from package.json
 * @param {string} [options.cwd]
 * @returns {import('rollup').Plugin}
 */
export default function aliasesPlugin({ aliases = {}, cwd } = {}) {
	let pkgFilename;
	let aliasesLoaded;
	async function fromPackageJson() {
		let json;
		try {
			const pkg = await fs.readFile(pkgFilename, 'utf-8');
			json = JSON.parse(pkg);
		} catch (e) {
			console.error('[aliases] Failed to load package.json from ' + pkgFilename);
		}
		if (json) {
			for (let i in aliases) if (!json.alias || !(i in json.alias)) delete aliases[i];
			if (json.alias) for (let i in json.alias) aliases[i] = json.alias[i];
		}
		aliasesLoaded = null;
	}
	return {
		name: 'aliases',
		async buildStart() {
			if (cwd) {
				pkgFilename = resolve(cwd, 'package.json');
				this.addWatchFile(pkgFilename);
			} else {
				const resolved = await this.resolve('./package.json');
				if (resolved) {
					pkgFilename = resolved.id;
					this.addWatchFile(pkgFilename);
				}
			}
		},
		watchChange(id) {
			if (id === pkgFilename) {
				aliasesLoaded = fromPackageJson();
			}
		},
		async resolveId(id, importer) {
			if (aliasesLoaded) await aliasesLoaded;
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
			if (aliased.startsWith('./')) {
				aliased = resolve(dirname(pkgFilename), aliased);
			}
			if (aliased === id) return;
			// now allow other resolvers to handle the aliased version
			// (this is important since they may mark as external!)
			return await this.resolve(aliased, importer, { skipSelf: true });
		}
	};
}
