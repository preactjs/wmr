#!/usr/bin/env node

import sade from 'sade';
import { start } from './index.js';
import * as pkg from '../package.json';

const prog = sade('wmr');

prog.version(pkg.version);

prog
	.command('start', 'Start a development server', { default: true })
	.option('--port', '-p', 'HTTP port to listen on (default: $PORT or 8080)')
	.option('--host', '-h', 'HTTP host to listen on (default: localhost)')
	.option('--compress', 'Enable compression', true)
	.option('--sourcemap', 'Enable Source Maps', false)
	.option('--cwd', 'Your web app root directory (default: ./public')
	.option('--out', 'Where to store generated files (default: ./.dist')
	.action((_, opts) => start(opts));

// const run = opts => {
// 	microbundle(opts)
// 		.then(output => {
// 			if (output != null) stdout(output);
// 			if (!opts.watch) process.exit(0);
// 		})
// 		.catch(err => {
// 			process.exitCode = (typeof err.code === 'number' && err.code) || 1;
// 			logError(err);
// 			process.exit();
// 		});
// };

// prog(run)(process.argv);
