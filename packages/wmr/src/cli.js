#!/usr/bin/env node

import sade from 'sade';
import build from './build.js';
import start from './start.js';
import serve from './serve.js';
import * as errorstacks from 'errorstacks';
import * as kl from 'kolorist';
import { fileURLToPath } from 'url';
import { promises as fs } from 'fs';
import { wmrCodeFrame } from './lib/output-utils.js';

const prog = sade('wmr');

// This variable will be replaced during build
prog.version(process.env.VERSION);

function bool(v) {
	return v !== false && !/false|0/.test(v);
}

// global options
prog
	.option('--cwd', 'The working directory - equivalent to "(cd FOO && wmr)"')
	// Setting env variables isn't common knowledege for many windows users. Much
	// easier to pass a flag to our binary instead.
	.option('--debug', 'Print internal debugging messages to the console. Same as setting DEBUG=true');

prog
	.command('build', 'make a production build')
	.option('--public', 'Your web app root directory (default: ./public)')
	.option('--out', 'Where to store generated files (default: ./dist)')
	.option('--prerender', 'Pre-render the application to HTML')
	.option('--sourcemap', 'Enable Source Maps')
	.option('--visualize', 'Launch interactive bundle visualizer')
	.option('--minify', 'Enable minification of generated code', true)
	.action(opts => {
		opts.minify = bool(opts.minify);
		run(build(opts));
	});

prog
	.command('serve', 'Start a production server')
	.option('--out', 'Directory to serve (default: ./dist)')
	.option('--port, -p', 'HTTP port to listen on (default: $PORT or 8080)')
	.option('--host', 'HTTP host to listen on (default: localhost)')
	.option('--http2', 'Use HTTP/2 (default: false)')
	.option('--compress', 'Enable compression (default: enabled)')
	.action(opts => {
		opts.compress = bool(opts.compress);
		run(serve(opts));
	});

prog
	.command('start', 'Start a development server', { default: true })
	.option('--public', 'Your web app root directory (default: ./public)')
	.option('--port, -p', 'HTTP port to listen on (default: $PORT or 8080)')
	.option('--host', 'HTTP host to listen on (default: localhost)')
	.option('--http2', 'Use HTTP/2 (default: false)')
	.option('--compress', 'Enable compression (default: enabled)')
	.option('--profile', 'Generate build statistics')
	.option('--reload', 'Switch off hmr and reload on file saves')
	.action(opts => {
		opts.optimize = !/false|0/.test(opts.compress);
		opts.compress = bool(opts.compress);
		if (/true/.test(process.env.PROFILE || '')) opts.profile = true;
		run(start(opts));
	});

prog.parse(process.argv);

function run(p) {
	p.catch(catchException);
}

/**
 * @param {Error} err
 */
async function catchException(err) {
	let text = '';
	let stack = '';
	let codeFrame = '';
	if (err.stack) {
		const formattedStack = errorstacks.parseStackTrace(err.stack);
		if (formattedStack.length > 0) {
			const idx = err.stack.indexOf(formattedStack[0].raw);
			text = err.stack.slice(0, idx).trim() + '\n';
			stack = formattedStack.map(frame => frame.raw).join('\n');

			// Find first non-internal frame of the stack
			const frame = formattedStack.find(frame => !frame.fileName.startsWith('node:') && frame.type !== 'native');
			if (frame) {
				let file = frame.fileName;
				file = file.startsWith('file://') ? fileURLToPath(file) : file;
				try {
					const code = await fs.readFile(file, 'utf-8');
					codeFrame = wmrCodeFrame(code, frame.line - 1, frame.column);
				} catch (err) {}
			}
		}
	}

	if (!text) text = err.message || err + '';

	const printFrame = codeFrame ? codeFrame + '\n' : '';
	const printStack = stack ? kl.dim(stack + '\n\n') : '';

	const hint = err.hint ? err.hint + '\n\n' : '';
	process.stderr.write(`\n${kl.cyan(hint)}${kl.red(text)}${printFrame || '\n'}${printStack}`);
	process.exit(1);
}

process.setUncaughtExceptionCaptureCallback(catchException);
