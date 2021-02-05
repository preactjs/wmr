#!/usr/bin/env node

import sade from 'sade';
import build from './build.js';
import start from './start.js';
import serve from './serve.js';
import * as kl from 'kolorist';

const prog = sade('wmr');

function bool(v) {
	return v !== false && !/false|0/.test(v);
}

prog
	.option('--public', 'Your web app root directory (default: ./public)')
	.option('--out', 'Where to store generated files (default: ./dist)')
	.option('--cwd', 'The working directory - equivalent to "(cd FOO && wmr)"')
	.command('build', 'make a production build')
	.option('--prerender', 'Pre-render the application to HTML')
	.action(opts => {
		opts.minify = opts.minify !== false && !/false|0/.test(opts.minify);
		run(build(opts));
	})
	.command('serve', 'Start a production server')
	.option('--out', 'Directory to serve (default: ./dist)')
	.option('--port, -p', 'HTTP port to listen on (default: $PORT or 8080)')
	.option('--host', 'HTTP host to listen on (default: localhost)')
	.option('--http2', 'Use HTTP/2 (default: false)')
	.option('--compress', 'Enable compression (default: enabled)')
	.action(opts => {
		opts.compress = bool(opts.compress);
		run(serve(opts));
	})
	.command('start', 'Start a development server', { default: true })
	.option('--port, -p', 'HTTP port to listen on (default: $PORT or 8080)')
	.option('--host', 'HTTP host to listen on (default: localhost)')
	.option('--http2', 'Use HTTP/2 (default: false)')
	.option('--compress', 'Enable compression (default: enabled)')
	.option('--sourcemap', 'Enable Source Maps')
	.option('--profile', 'Generate build statistics')
	.option('--reload', 'Switch off hmr and reload on file saves')
	.option('--no-preact', 'Disable Preact-specific features')
	.action(opts => {
		opts.preact = !bool(opts['no-preact'] || 'false');
		opts.optimize = !/false|0/.test(opts.compress);
		opts.compress = bool(opts.compress);
		if (/true/.test(process.env.PROFILE)) opts.profile = true;
		run(start(opts));
	});

prog.parse(process.argv);

function run(p) {
	p.catch(err => {
		const text = (process.env.DEBUG ? err.stack : err.message) || err + '';
		process.stderr.write(`${kl.red(text)}\n`);
		process.exit(p.code || 1);
	});
}
