import { copyFileSync, readFileSync, writeFileSync } from 'fs';
import dtsbundle from './~dtsbundle.js';

const dry = /dry/.test(process.argv.join(' '));
const read = f => readFileSync(f, 'utf-8');
const write = dry ? console.info : writeFileSync;
const copy = dry ? (f, t) => console.info(`copy ${f} to ${t}`) : copyFileSync;

const pkg = JSON.parse(read('package.json'));
copy('package.json', '.package.json');
const { name, version, bin, author, contributors, repository, dependencies, types, files } = pkg;
const normalized = {
	name,
	version,
	bin,
	author,
	contributors,
	repository,
	dependencies,
	scripts: {
		postpack: 'mv -f .package.json package.json && mv -f .types.d.ts types.d.ts'
	},
	// engines: pkg.engines,
	types,
	files
};
write('package.json', JSON.stringify(normalized, null, 2));

const t = normalized.types.replace(/^\.*\//g, '');
copy(t, '.' + t);
dtsbundle('.' + t, t);
