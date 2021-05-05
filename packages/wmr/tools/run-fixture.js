import { spawn } from 'child_process';

spawn(
	process.execPath,
	['src/cli.js', 'start', '--cwd', 'test/fixtures/' + process.argv.slice(2)[0], ...process.argv.slice(3)],
	{
		stdio: 'inherit',
		env: {
			// Package "application-config-path" needs this (required by devcert)
			HOME: process.env.HOME,
			FORCE_COLOR: '1',
			DEBUG: 'true',
			TERM: 'xterm-256color'
		}
	}
);
