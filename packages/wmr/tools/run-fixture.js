import { spawn } from 'child_process';
import path from 'path';
import * as kl from 'kolorist';
import ncp from 'ncp';
import { isFile } from '../src/lib/fs-utils.js';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

(async () => {
	const command = process.argv[2];
	const name = process.argv[3];

	const commands = ['start', 'serve', 'build'];
	if (!commands.includes(command)) {
		// eslint-disable-next-line no-console
		console.log(
			kl.red(
				`Command must be one of ${commands
					.map(x => `"${x}"`)
					.join(',')}, but got "${command}". Did you mean "yarn wmr fixture start ${command}" instead?"`
			)
		);
		process.exit(1);
	}

	const rest = process.argv.slice(4);
	const fixture = path.join(__dirname, '..', 'test', 'fixtures', name);
	const fakeModDir = path.join('fixture', '-node_modules');

	if (await isFile(fakeModDir)) {
		await new Promise((resolve, reject) =>
			ncp(fakeModDir, path.join(fixture, 'node_modules'), err => (err ? reject(err) : resolve()))
		);
	}

	spawn(process.execPath, ['src/cli.js', command, '--cwd', 'test/fixtures/' + name, ...rest], {
		stdio: 'inherit',
		env: {
			// Package "application-config-path" needs this (required by devcert)
			HOME: process.env.HOME,
			FORCE_COLOR: '1',
			DEBUG: 'true',
			TERM: 'xterm-256color'
		}
	});
})();
