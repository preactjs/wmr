import { promises as fs } from 'fs';
// import zlib from 'zlib';
// import terser from 'terser';
import * as rollup from 'rollup';
import { resolvePackageVersion } from '../plugins/npm-plugin/registry.js';
import npmPlugin, { normalizeSpecifier } from '../plugins/npm-plugin/index.js';
import commonjs from '@rollup/plugin-commonjs';
import json from '@rollup/plugin-json';
import { dirname } from 'path';

// 1 minute
const CACHE_TTL = 60000;
// const CACHE_TTL = 0;

const BUNDLE_CACHE = new Map();

/*
const BROTLI_OPTS = {
	//level: 11
	params: {
		[zlib.constants.BROTLI_PARAM_MODE]: zlib.constants.BROTLI_DEFAULT_MODE,
		[zlib.constants.BROTLI_PARAM_QUALITY]: zlib.constants.BROTLI_MAX_QUALITY,
		[zlib.constants.BROTLI_PARAM_SIZE_HINT]: 0
	}
};

function upgradeToBrotli(mem) {
	mem.upgrading = true;

	const result = terser.minify(mem.code, {
		mangle: true,
		compress: true,
		module: true,
		ecma: 9,
		safari10: true,
		sourceMap: false
	});
	if (result.warnings) {
		console.warn(result.warnings.join('\n'));
	}
	if (result.error) {
		console.error(result.error);
	} else {
		mem.code = result.code;
	}

	zlib.brotliCompress(mem.code, BROTLI_OPTS, (err, data) => {
		mem.upgrading = false;
		mem.brotli = data;
	});
}
*/

/** @returns {import('polka').Middleware} */
export default function npmMiddleware() {
	return async (req, res, next) => {
		// const mod = req.url.replace(/\?.*$/g, '');
		const mod = req.path.replace(/^\//, '');
		try {
			const meta = normalizeSpecifier(mod);
			await resolvePackageVersion(meta);
			// console.log('npm: ', meta.specifier);

			const cacheKey = Buffer.from(`${meta.specifier}${meta.version}`).toString('base64');
			// @TODO - flatten inner path and include version?
			const cacheFile = `node_modules/${meta.module}/.cache/${cacheKey}.js`;

			if (req.headers['if-none-match'] === cacheKey) {
				res.writeHead(304);
				res.end();
				// if (BUNDLE_CACHE.has(cacheKey)) {
				//   const mem = BUNDLE_CACHE.get(cacheKey);
				//   if (++mem.uses >= 10 && !mem.brotli && !mem.upgrading) {
				//     upgradeToBrotli(mem);
				//   }
				// }
				return;
			}

			// disable caching during development
			let cached,
				cacheStatus = 'MEMORY',
				brotli;

			if (BUNDLE_CACHE.has(cacheKey)) {
				const mem = BUNDLE_CACHE.get(cacheKey);
				if (Date.now() - mem.modified <= CACHE_TTL) {
					cached = mem.code;
					brotli = mem.brotli;
					// if (++mem.uses >= 10 && !brotli && !mem.upgrading) {
					// 	upgradeToBrotli(mem);
					// }
				}
			} else {
				let stat;
				try {
					stat = await fs.stat(cacheFile);
				} catch (e) {}
				if (stat && Date.now() - stat.mtimeMs <= CACHE_TTL) {
					// cached = await fs.readFile(cacheFile, 'utf-8');
					cached = await fs.readFile(cacheFile);
					// ressurect the in-memory cache entry from disk:
					BUNDLE_CACHE.set(cacheKey, {
						uses: 1,
						brotli: null,
						upgrading: false,
						modified: stat.mtimeMs,
						code: cached
					});
					cacheStatus = 'DISK';
				}
			}

			if (cached) {
				const headers = {
					'content-type': 'application/javascript',
					etag: cacheKey,
					'x-cache-status': cacheStatus
				};
				if (brotli && /\bbr\b/.test(req.headers['accept-encoding'] + '')) {
					headers['content-encoding'] = 'br';
					headers['content-length'] = brotli.byteLength;
				} else {
					brotli = null;
				}
				res.writeHead(200, headers);
				res.end(brotli || cached);
				return;
			}

			const start = Date.now();

			const bundle = await rollup.rollup({
				treeshake: false,
				input: mod, //meta.specifier + '/' + meta.path,
				// inlineDynamicImports: true,
				// shimMissingExports: true,
				plugins: [
					npmPlugin({
						publicPath: '/@npm'
					}),
					commonjs({
						// ignoreGlobal: true,
						// include: /^\0npm/
						sourceMap: false,
						transformMixedEsModules: false
					}),
					json(),
					// localNpmPlugin(),
					{
						name: 'never-disk',
						// resolveId(s) {
						// 	return false;
						// },
						load(s) {
							throw Error('local access not allowed');
						}
					}
				]
				// external(source, importer, isResolved) {
				// 	console.log(source, importer, isResolved);
				// }
				// manualChunks(filename, { getModuleInfo }) {
				// 	console.log('chunk: ', filename, getModuleInfo(filename));
				// 	return filename.replace(/^\0npm\//, '@npm/');
				// }
			});

			const { output } = await bundle.generate({
				format: 'es',
				// compact: true,
				// freeze: false,
				indent: false,
				// strict: false,
				// interop: false,
				// esModule: false,
				entryFileNames: '[name].js',
				chunkFileNames: '[name].js',

				// Don't transform paths at all:
				paths(str) {
					return str;
				},

				// libraries are generally already minified, this is a waste:
				plugins: [
					// {
					// 	name: 'fast-minify',
					// 	renderChunk(code, chunk) {
					// 		const start = Date.now();
					// 		const out = terser.minify(code, {
					// 			mangle: true,
					// 			compress: false,
					// 			module: true,
					// 			ecma: 9,
					// 			safari10: true,
					// 			// sourceMap: false,
					// 			output: {
					// 				comments: false
					// 			}
					// 		});
					// 		if (out.error) {
					// 			throw out.error;
					// 		}
					// 		if (out.warnings) {
					// 			console.warn(out.warnings.join('\n'));
					// 		}
					// 		console.log('Terser took ' + (Date.now() - start) + 'ms');
					// 		return out.code;
					// 	}
					// }
				]
			});

			const code = output[0].code;

			// console.log('middleware::done ', mod, code);

			BUNDLE_CACHE.set(cacheKey, {
				uses: 0,
				brotli: null,
				upgrading: false,
				modified: Date.now(),
				code
			});

			fwrite(cacheFile, code);

			res.writeHead(200, {
				'content-type': 'application/javascript',
				'content-length': code.length,
				etag: cacheKey
			});
			res.end(code);

			console.log(`Bundle dep: ${mod}: ${Date.now() - start}ms`);
		} catch (e) {
			console.error(`Error bundling ${mod}: `, e);
			next(e);
		}
	};
}

// @TODO: this is basically writeNpmFile from registry.js
async function fwrite(filename, data) {
	await fs.mkdir(dirname(filename), { recursive: true });
	await fs.writeFile(filename, data);
}
