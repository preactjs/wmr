import { spawn, spawnSync } from 'child_process';
import fs from 'fs';
import path from 'path';

const fixturePath = 'test/fixtures/' + process.argv.slice(2)[0];
const pkgJson = path.join(fixturePath, 'package.json');

if (fs.existsSync(pkgJson)) {
	spawnSync('npm', ['install', '--silent'], { cwd: fixturePath });
}

spawn(process.execPath, ['src/cli.js', 'start', '--cwd', fixturePath, ...process.argv.slice(3)], {
	stdio: 'inherit',
	env: {
		// Package "application-config-path" needs this (required by devcert)
		HOME: process.env.HOME,
		FORCE_COLOR: '1',
		DEBUG: 'true',
		TERM: 'xterm-256color'
	}
});
