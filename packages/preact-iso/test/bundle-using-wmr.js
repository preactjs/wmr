import { mkdirSync, rmdirSync, unlinkSync, readdirSync, renameSync, writeFileSync } from 'fs';
import { execFileSync } from 'child_process';

const code = `
import 'preact';
import 'preact/hooks';
import 'preact-render-to-string';
import('../index.js');
`;

rmr('.dist');
rmr('.tmp');
mkdirSync('.tmp');
writeFileSync('.tmp/x.js', code);
writeFileSync('.tmp/index.html', '<script type=module src=x.js>');
execFileSync('node', ['--experimental-modules', '../../wmr/src/cli.js', 'build'], {
	cwd: '.tmp',
	encoding: 'utf-8',
	stdio: 'inherit'
});
renameSync('.tmp/dist/chunks', '.dist');
rmr('.tmp');

function rmr(path) {
	try {
		readdirSync(path).forEach(rmr);
		rmdirSync(path, { recursive: true });
	} catch (e) {
		try {
			unlinkSync(path);
		} catch (e) {}
	}
}
