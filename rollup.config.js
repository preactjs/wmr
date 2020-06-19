import shebangPlugin from 'rollup-plugin-preserve-shebang';
import commonjs from '@rollup/plugin-commonjs';
import nodeResolve from '@rollup/plugin-node-resolve';
import alias from '@rollup/plugin-alias';
import virtual from '@rollup/plugin-virtual';
import json from '@rollup/plugin-json';
import builtins from 'builtin-modules';
import terser from 'terser';

/** @type {import('rollup').RollupOptions} */
const config = {
	input: 'src/cli.js',
	inlineDynamicImports: true,
	output: {
		file: 'wmr.cjs',
		format: 'cjs',
		compact: true,
		externalLiveBindings: false,
		plugins: [
			{
				name: 'minify',
				renderChunk(code) {
					return terser.minify(code, {
						ecma: 9,
						compress: true,
						mangle: true,
						sourceMap: false,
						output: { comments: false }
					}).code;
				}
			}
		]
	},
	// external: ['fsevents'].concat(builtins),
	external: [].concat(builtins),
	// /* Logs all included npm dependencies: */
	// external(source, importer) {
	// 	const ch = source[0];
	// 	if (ch === '.' || ch === '/') return false;
	// 	if (source === 'fsevents' || builtins.includes(source)) return true;
	// 	const mod = source.match(/^(@[^/]+\/)?[^/]+/)[0];
	// 	const mods = global.mods || (global.mods = new Set());
	// 	if (!mods.has(mod)) {
	// 		mods.add(mod);
	// 		console.log(mod, 'imported by', importer);
	// 	}
	// },
	plugins: [
		shebangPlugin(),
		{
			// This inlines some fs.promises.readFile() calls, while allowing them to run unbundled in Node.
			name: 'inline-fs-readfile',
			transform(code, id) {
				if (/\/\/\s*rollup-inline-files/.test(code)) {
					code = code.replace(
						/fs\.readFile\(new\s+URL\s*\(\s*(['"`])(.+?)\1\s*,\s*__filename\s*\)\s*,\s*'utf-8'\s*\)/g,
						(str, quote, filename) => {
							const path = require('path');
							const fs = require('fs');
							const filepath = path.resolve(path.dirname(id), filename);
							try {
								const text = fs.readFileSync(filepath, 'utf-8');
								// console.log('inlined ' + filename + ' into ' + id + ': ' + text.length + 'b');
								return `Promise.resolve(${JSON.stringify(text)})`;
							} catch (err) {
								this.warn(`Failed to inline ${filename} into ${id}:\n${err.message}`);
								return `Promise.reject(Error(${JSON.stringify(err.message)}))`;
							}
						}
					);
					return { code, map: null };
				}
			}
		},
		{
			// This fixes DevCert breaking in Rollup due to dynamic require usage.
			// https://github.com/davewasmer/devcert/blob/master/src/platforms/index.ts
			name: 'fix-devcert',
			transform(code, id) {
				if (/devcert\/dist\/platforms\/index\.js$/.test(id)) {
					const platforms = require('fs')
						.readdirSync('node_modules/devcert/dist/platforms')
						.reduce((str, p) => {
							const name = p.replace(/\.js$/, '');
							if (name !== p && name !== 'index') {
								if (str) str += ',';
								str += `"${name}": require("./${p}")`;
							}
							return str;
						}, '');
					return code.replace('require(`./${process.platform}`)', `({${platforms}})[process.platform]`);
				}
			}
		},
		virtual({
			fsevents: `
				module.exports = {
					get watch() {
						return require('fsevents/fsevents.js').watch;
					},
					get getInfo() {
						return require('fsevents/fsevents.js').getInfo;
					},
					get constants() {
						return require('fsevents/fsevents.js').constants;
					}
				};
			`,
			// remove pointless util.inherits shim
			inherits: `module.exports = require('util').inherits;`
		}),
		alias({
			entries: [
				// bypass native modules aimed at production WS performance
				{ find: /^bufferutil$/, replacement: 'bufferutil/fallback.js' },
				{ find: /^utf-8-validate$/, replacement: 'utf-8-validate/fallback.js' },
				// just use native streams
				{ find: /^readable-stream$/, replacement: 'stream' },
				// avoid pulling in 50kb of "editions" dependencies to resolve one file
				{ find: /^istextorbinary$/, replacement: 'istextorbinary/edition-node-0.12/index.js' } // 2.6.0
			]
		}),
		commonjs({
			ignore: [f => f.endsWith('.mjs'), 'inherits', 'fsevents', ...builtins],
			ignoreGlobal: true
		}),
		nodeResolve({
			preferBuiltins: true
		}),
		json()
	]
};

export default config;
