import { copyFileSync, readFileSync, writeFileSync, unlinkSync } from 'fs';

const dry = /dry/.test(process.argv.join(' '));
const read = f => readFileSync(f, 'utf-8');
const write = dry ? console.info : writeFileSync;

const pkg = JSON.parse(read('package.json'));
copyFileSync('package.json', '.package.json');
copyFileSync('package-lock.json', '.package-lock.json');
const normalized = {
	name: pkg.name,
	version: pkg.version,
	bin: pkg.bin,
	author: pkg.author,
	scripts: {
		postpack: 'mv -f .package.json package.json || true; mv -f .package-lock.json package-lock.json || true'
	},
	// engines: pkg.engines,
	files: pkg.files
};
write('package.json', JSON.stringify(normalized, null, 2));
