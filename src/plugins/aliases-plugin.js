import { promises as fs } from 'fs';

/**
 * Convert JSX to HTM
 * @param {object} [options]
 * @param {Record<string,string>} [options.aliases] If omitted, obtained (and watched) from package.json
 * @returns {import('rollup').Plugin}
 */
export default function aliasesPlugin({ aliases } = {}) {
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
			const resolved = await this.resolve('./package.json');
			if (resolved) {
				pkgFilename = resolved.id;
				this.addWatchFile(pkgFilename);
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
			for (let i in aliases) {
				if (id === i || id.startsWith(i + '/')) {
					const aliased = aliases[i];
					// now allow other resolvers to handle the aliased version
					// (this is important since they may mark as external!)
					return await this.resolve(aliased, importer, { skipSelf: true });
				}
			}
		}
	};
}
