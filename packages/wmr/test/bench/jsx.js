/**
 * To run the benchmark:
 * $ npm install benchmarkjs-pretty
 * $ node test/bench/jsx.js
 */

import fs from 'fs';
import b from 'benchmarkjs-pretty';
const Benchmark = b.default;

// Babel config
import babel from '@babel/core';
import jsx from 'babel-plugin-transform-jsx-to-htm';
const BABEL_CONFIG = {
	plugins: [jsx],
	sourceType: 'module',
	babelrc: false,
	configFile: false,
	generatorOpts: { retainLines: true }
};

// acorn-traverse config:
import Acorn from 'acorn';
import acornJsx from 'acorn-jsx';
import { transform } from '../../src/lib/acorn-traverse.js';
import jsxToHtm from '../../src/lib/transform-jsx-to-htm-lite.js';
const acornParser = Acorn.Parser.extend(acornJsx());
const ACORN_OPTS = { ecmaVersion: 2020, sourceType: 'module', locations: false };
const ACORN_TRAVERSE_CONFIG = {
	plugins: [jsxToHtm],
	parse: code => acornParser.parse(code, ACORN_OPTS)
};

// Some code samples from the demo app
const code1 = fs.readFileSync('../../demo/public/pages/home/index.js', 'utf-8');
const code2 = fs.readFileSync('../../demo/public/pages/environment/index.js', 'utf-8');
const code3 = fs.readFileSync('../../demo/public/pages/about/index.js', 'utf-8');
const code4 = fs.readFileSync('../../demo/public/pages/compat.js', 'utf-8');

new Benchmark('jsx')
	.add('babel', () => {
		babel.transformSync(code1, BABEL_CONFIG);
		babel.transformSync(code2, BABEL_CONFIG);
		babel.transformSync(code3, BABEL_CONFIG);
		babel.transformSync(code4, BABEL_CONFIG);
	})
	.add('acorn-traverse', () => {
		transform(code1, ACORN_TRAVERSE_CONFIG);
		transform(code2, ACORN_TRAVERSE_CONFIG);
		transform(code3, ACORN_TRAVERSE_CONFIG);
		transform(code4, ACORN_TRAVERSE_CONFIG);
	})
	.run();
