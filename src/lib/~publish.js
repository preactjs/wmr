import { copyFileSync, readFileSync, writeFileSync } from 'fs';

const dry = /dry/.test(process.argv.join(' '));
const read = f => readFileSync(f, 'utf-8');
const write = dry ? console.info : writeFileSync;
const copy = dry ? (f, t) => console.info(`copy ${f} to ${t}`) : copyFileSync;

const pkg = JSON.parse(read('package.json'));
copy('package.json', '.package.json');
copy('package-lock.json', '.package-lock.json');
const { name, version, bin, author, contributors, repository, dependencies, files } = pkg;
const normalized = {
	name,
	version,
	bin,
	author,
	contributors,
	repository,
	dependencies,
	scripts: {
		postpack: 'mv -f .package.json package.json || true; mv -f .package-lock.json package-lock.json || true'
	},
	// engines: pkg.engines,
	files
};
write('package.json', JSON.stringify(normalized, null, 2));
