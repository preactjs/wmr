import { resolve, relative, join } from 'path';
import { promises as fs } from 'fs';

const IGNORE_FILES = [
	'.',
	'node_modules',
	'package.json',
	'package-lock.json',
	'yarn.lock',
	'tsconfig.json',
	'babel.config.js',
	'/dist',
	'/build'
];

/**
 * @param {object} [options]
 * @param {string} [options.cwd]
 * @returns {import('rollup').Plugin}
 */
export default function copyAssetsPlugin({ cwd = '.' } = {}) {
	cwd = resolve('.', cwd);
	let entries = [];
	return {
		name: 'copy-assets',
		buildStart(options) {
			entries = [options.input].flatMap(f => (typeof f === 'object' ? Object.values(f) : f));
		},
		async generateBundle(_, bundle) {
			const processed = new Set();

			for (const f of entries) processed.add(relative(cwd, f));

			for (let i in bundle) {
				// never overwrite a generated file:
				processed.add(i);

				const chunk = bundle[i];
				if (chunk.type === 'chunk') {
					for (const f of chunk.referencedFiles) processed.add(f);
					for (const f in chunk.modules) {
						if (f[0] === '\0' || f[0] === '\b') continue;
						processed.add(relative(cwd, f));
					}
				} else if (chunk.name) {
					// TODO: this isn't safe because names aren't paths
					processed.add(chunk.name);
					// // @ts-ignore-next
					// if (chunk.referencedFiles) for (const f of chunk.referencedFiles) processed.add(f);
				}
			}

			const files = await readdirRecursive(cwd, [...IGNORE_FILES, ...Array.from(processed).map(f => '/' + f)]);

			await Promise.all(
				files.map(async name => {
					this.emitFile({
						type: 'asset',
						fileName: name,
						source: await fs.readFile(join(cwd, name))
					});
				})
			);
		}
	};
}

/**
 * @param {string} rootDir directory in which to search
 * @param {string[]} [ignore = []] Root-relative paths start with `/`, no slash ignores by file basename, `"."` ignores all dotfiles
 */
async function readdirRecursive(rootDir, ignore = []) {
	const files = [];
	const noDotFiles = ignore.includes('.');
	const r = async dir => {
		const p = [];
		const wdir = join(rootDir, dir);
		for (const f of await fs.readdir(wdir, { withFileTypes: true })) {
			const name = join(dir, f.name);
			if ((noDotFiles && f.name[0] === '.') || ignore.includes(f.name) || ignore.includes('/' + name)) continue;
			if (f.isFile()) files.push(name);
			else if (f.isDirectory()) p.push(r(name));
		}
		if (p.length) await Promise.all(p);
	};
	await r('');
	return files;
}
