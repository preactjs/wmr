#!/usr/bin/env node

import sade from 'sade';
import build from './build.js';
import start from './start.js';

const prog = sade('wmr');

prog
	.option('--cwd', 'Your web app root directory (default: ./public)')
	.option('--out', 'Where to store generated files (default: ./dist)')
	.command('build', 'make a production build')
	.action(opts => {
		build(opts);
	})
	.command('start', 'Start a development server', { default: true })
	.option('--port, -p', 'HTTP port to listen on (default: $PORT or 8080)')
	.option('--host', 'HTTP host to listen on (default: localhost)')
	.option('--http2', 'Use HTTP/2 (default: false)')
	.option('--compress', 'Enable compression (default: enabled)')
	.option('--sourcemap', 'Enable Source Maps')
	.option('--profile', 'Generate build statistics')
	.option('--prebuild', 'Build modules at startup using Rollup')
	.action(opts => {
		opts.optimize = !/false|0/.test(opts.compress);
		if (/true|false/.test(opts.compress)) opts.compress = opts.compress !== 'false';
		if (/true/.test(process.env.PROFILE)) opts.profile = true;
		start(opts);
	});

prog.parse(process.argv);
