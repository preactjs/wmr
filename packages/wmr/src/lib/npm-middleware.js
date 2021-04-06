import * as rollup from 'rollup';
import { promises as fs } from 'fs';
import * as path from 'path';
import commonjs from '@rollup/plugin-commonjs';
import json from '@rollup/plugin-json';
import { getNpmPackageDir, normalizeSpecifier } from '../plugins/npm-plugin/index.js';
import { loadPackageFile } from '../plugins/npm-plugin/registry.js';
import { getCachedBundle, setCachedBundle, sendCachedBundle, enqueueCompress } from './npm-middleware-cache.js';
import processGlobalPlugin from '../plugins/process-global-plugin.js';
import aliasesPlugin from '../plugins/aliases-plugin.js';
import { getMimeType } from './mimetypes.js';
import nodeBuiltinsPlugin from '../plugins/node-builtins-plugin.js';
import * as kl from 'kolorist';
import { hasDebugFlag, debug } from './output-utils.js';
import { resolve as resolveExports, legacy as resolveLegacy } from 'resolve.exports';
import { transformImports } from './transform-imports.js';

/**
 * Serve a "proxy module" that uses the WMR runtime to load CSS.
 * @param {ReturnType<normalizeSpecifier>} meta
 * @param {import('http').ServerResponse} res
 */
async function handleAsset(meta, res) {
	let code = '',
		type = getMimeType(meta.path);
	if (/\.css\.js$/.test(meta.path)) {
		const specifier = JSON.stringify('/@npm/' + meta.specifier.replace(/\.js$/, ''));
		code = `import{style}from '/_wmr.js';\nstyle(${specifier});`;
	} else {
		code = await loadPackageFile(meta);
	}
	res.writeHead(200, {
		'content-type': type || 'text/plain',
		'content-length': Buffer.byteLength(code)
	});
	res.end(code);
}

/**
 * @param {object} options
 * @param {Record<string,string>} options.aliases
 * @param {boolean} [options.optimize = true] Progressively minify and compress dependency bundles?
 * @param {string} [options.cwd] Virtual cwd
 * @returns {import('polka').Middleware}
 */
export default function npmMiddleware({ aliases, optimize, cwd }) {
	return async (req, res, next) => {
		// @ts-ignore
		const mod = req.path.replace(/^\//, '');
		const meta = normalizeSpecifier(mod);
		const packageDir = getNpmPackageDir(mod);

		try {
			meta.version = JSON.parse(await fs.readFile(path.join(packageDir, 'package.json'), 'utf-8')).version;
		} catch (e) {
			return next(e);
		}

		try {
			// The package name + path + version is a strong ETag since versions are immutable
			const etag = Buffer.from(`${meta.specifier}${meta.version}`).toString('base64');
			const ifNoneMatch = String(req.headers['if-none-match']).replace(/-(gz|br)$/g, '');
			if (ifNoneMatch === etag) {
				return res.writeHead(304).end();
			}
			res.setHeader('etag', etag);

			// CSS files and proxy modules don't use Rollup.
			if (/\.((css|s[ac]ss)(\.js)?|wasm|txt|json)$/.test(meta.path)) {
				return handleAsset(meta, res);
			}

			res.setHeader('content-type', 'application/javascript;charset=utf-8');
			if (hasDebugFlag()) {
				console.log(`  ${kl.dim('middleware:') + kl.bold(kl.magenta('npm'))}  ${JSON.stringify(meta.specifier)}`);
			}

			// serve from memory and disk caches:
			const cached = await getCachedBundle(etag, meta, cwd);
			if (cached) return sendCachedBundle(req, res, cached);

			// const start = Date.now();
			let code = await bundleNpmModule(mod, { aliases, packageDir });
			code = await transformImports(code, mod, {
				resolveId(spec) {
					// Turn bare specifiers into an absolute URL
					if (!/^\0?\.?\.?[/\\]/.test(spec)) {
						return '/@npm/' + spec;
					}
					return null;
				}
			});
			// console.log(`Bundle dep: ${mod}: ${Date.now() - start}ms`);

			// send it!
			res.writeHead(200, { 'content-length': Buffer.byteLength(code) }).end(code);

			// store the bundle in memory and disk caches
			setCachedBundle(etag, code, meta, cwd);

			// this is a new bundle, we'll compress it with terser and brotli shortly
			if (optimize !== false) {
				enqueueCompress(etag);
			}
		} catch (e) {
			console.error(`Error bundling ${mod}: `, e);
			next(e);
		}
	};
}

let npmCache;

const log = debug('bundle:npm');

/**
 * Bundle am npm module entry path into a single file
 * @param {string} mod The module to bundle, including subpackage/path
 * @param {object} options
 * @param {Record<string,string>} options.aliases
 * @param {boolean} [options.stream]
 * @param {string} options.packageDir Folder where the module lies on
 * disk (= same folder as package.json of that module)
 */
export async function bundleNpmModule(mod, { aliases, packageDir, stream }) {
	// Now let's find the entry file
	const pkgJson = JSON.parse(await fs.readFile(path.join(packageDir, 'package.json'), 'utf-8'));

	// Thanks to Luke Edwards for this excellent package!!
	let resolved =
		resolveExports(pkgJson, mod) ||
		resolveLegacy(pkgJson, {
			browser: false
		});

	if (!resolved) {
		throw new Error(`Could not resolve npm module: ${mod}. Did you forget to install it?`);
	}

	const entry = path.join(packageDir, resolved);
	log(`Bundling ${kl.cyan(mod)} -> ${kl.dim(entry + '...')}`);

	const bundle = await rollup.rollup({
		input: entry,
		cache: npmCache,
		shimMissingExports: true,
		treeshake: false,
		preserveEntrySignatures: 'allow-extension',
		onwarn: warning => {
			// Ignore external dependencies warning, because we want those
			// to be external.
			if (warning.code === 'UNRESOLVED_IMPORT') return;
		},
		plugins: [
			nodeBuiltinsPlugin({}),
			aliasesPlugin({ aliases }),
			// TODO: Add back a streaming plugin
			stream && {
				name: 'stream-npm'
			},
			processGlobalPlugin({
				NODE_ENV: 'development'
			}),
			commonjs({
				extensions: ['.js', '.cjs', ''],
				sourceMap: false,
				transformMixedEsModules: true
			}),
			json(),
			{
				name: 'no-builtins',
				load(s) {
					if (s === 'fs' || s === 'path') {
						return 'export default {};';
					}
				}
			},
			stream && {
				name: 'never-disk',
				load(s) {
					throw Error('local access not allowed');
				}
			}
		].filter(Boolean)
	});

	npmCache = bundle.cache;

	const { output } = await bundle.generate({
		format: 'es',
		indent: false,
		// entryFileNames: '[name].js',
		// chunkFileNames: '[name].js',
		// Don't transform paths at all:
		paths: String
	});

	return output[0].code;
}
