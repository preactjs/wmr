import { promises as fs } from 'fs';
import { resolve, dirname, posix } from 'path';
import { fileURLToPath } from 'url';
import { get as httpsGet } from 'https';
import { init, parse } from 'es-module-lexer';
import { builtinModules } from 'module';

const CDN = 'https://unpkg.com';
const FILES = ['index.d.ts', 'types.d.ts', 'typings.d.ts'];
const NODE_MODULES = '../../node_modules'; // This is a hard-coded nonsensical default.
const ignore = /@types\//; // For @types/ just use automatic type acquisition, it's better than this attrocity.

const read = f => (/^https:/.test(f) ? get(f) : fs.readFile(f, 'utf-8'));
const write = fs.writeFile;
const get = url =>
	new Promise((resolve, reject) => {
		httpsGet(url, res => {
			let buf = '';
			if (res.headers.location) return resolve(get(new URL(res.headers.location, url).href));
			const s = res.statusCode || 0;
			if (s < 200 || s >= 400) return reject(Error(`${s} ${url}`));
			res.on('data', c => (buf += c)).on('end', () => resolve(buf));
		}).on('error', reject);
	});

async function npmDir(spec) {
	const dir = `${NODE_MODULES}/${spec}`;
	try {
		if ((await fs.stat(dir)).isDirectory()) return dir;
	} catch (e) {}
}

async function fetchTypes(loc) {
	if (loc.match(/\.d\.ts$/)) return read(loc);
	const pkg = JSON.parse(await read(`${loc}/package.json`));
	const files = [...new Set([pkg.types, pkg.typings, ...FILES])].filter(Boolean).map(f => posix.normalize(f));
	for (const file of files) {
		try {
			return await read(`${loc}/${file}`);
		} catch (e) {}
	}
	throw Error(`Failed to fetch ${loc} (tried ${files})`);
}

async function getTypes(spec) {
	const types = [await npmDir(spec), await npmDir(`@types/${spec}`), `${CDN}/${spec}`, `${CDN}/@types/${spec}`];
	let err;
	for (const id of types) {
		if (!id) continue;
		try {
			return { code: await fetchTypes(id), id };
		} catch (e) {
			err = e;
		}
	}
	throw err;
}

export default async function dtsbundle(...args) {
	const output = args.pop();
	const input = args.pop() || '.';
	if (!output) throw `Missing required argument: dts-bundle <output>`;
	if (input === output) throw `Refusing to overwrite input file: dts-bundle <input> <output>`;
	await init;
	let dependencies = new Map();
	let c = 0;
	let modules = new Map();
	async function bundle(code, filename) {
		if (dependencies.has(filename)) return '';
		dependencies.set(filename, ++c);
		const abs = resolve(filename);
		/**
		 * WARNING:
		 * This Program contains coarse language (grammar) and disturbing visuals.
		 * Viewer discretion is advised.
		 */
		let imports;
		let parens = 0;
		// let js = code.replace(/(declare\s+module|(declare\s+)?namespace)\s[^{]+{/g, s => (++parens, ' '.repeat(s.length)));
		let js = code.replace(/declare\s+module\s[^{]+{/g, s => (++parens, ' '.repeat(s.length)));
		for (let i = parens + 1; i--; ) {
			try {
				imports = parse(js, abs)[0];
				break;
			} catch (e) {
				if (e.idx) js = js.substring(0, e.idx) + ' ' + js.substring(e.idx + 1);
			}
		}
		if (!imports) return '';
		let out = '';
		let offset = 0;
		for (const imp of imports) {
			out += code.substring(offset, imp.ss);
			let spec = imp.n || code.substring(imp.s, imp.e);
			if (builtinModules.includes(spec.replace(/^([^@/])\/.*$/g, '$1'))) {
				offset = imp.ss;
				continue;
			}
			const specString = JSON.stringify('bundled:' + spec);
			if (!dependencies.has(spec)) {
				let ret;
				if (/^\.*\//.test(spec)) {
					const id = resolve(dirname(abs), spec);
					ret = { id, code: await read(id) };
				} else {
					ret = await getTypes(spec);
				}
				if (ignore.test(ret.id)) {
					console.log(`${spec} resolved to ${ret.id}, kept as external`);
					offset = imp.ss;
					continue;
				}
				console.log(`${spec} resolved to ${ret.id}`);
				let child = await bundle(ret.code, spec);
				if (child) {
					// child = child.replace(
					// 	/declare module ((['"]).*?\2)/g,
					// 	'/* removed ambient module declaration: $1 */ namespace ___'
					// );
					// child = child.replace(/^\s*declare[\s\n]+([^\s\n]+)/gm, (s, m) => (m === 'module' ? s : m));
					child = child.replace(/^\s*declare[\s\n]+([^\s\n]+)/gm, '$1');
					const mod = `\ndeclare module ${specString} {\n${child}\n}\n`;
					modules.set(spec, mod);
				}
			}
			// replace the import with our internal specifier:
			out += code.substring(imp.ss, imp.s) + specString.slice(1, -1) + code.substring(imp.e, imp.se);
			offset = imp.se;
			// while (/[;\s]/.test(code[offset])) offset++;
		}
		out += code.substring(offset);
		return out;
	}
	let bundled = await bundle(await fetchTypes(input), '.');
	// bundled = modules.join('\n\n') + bundled;
	const m = [...modules.keys()].sort((a, b) => dependencies.get(b) - dependencies.get(a));
	bundled = m.map(m => modules.get(m)).join('\n\n') + bundled;
	await write(output, bundled);
}

// CLI
if (process.argv[1].replace(/\.js$/, '') === fileURLToPath(import.meta.url).replace(/\.js$/, '')) {
	dtsbundle(...process.argv.slice(2))
		.then(() => console.log('done'), console.error)
		.catch(() => process.exit(1));
}
