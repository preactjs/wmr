import * as rollup from 'rollup';
import commonjs from '@rollup/plugin-commonjs';
import json from '@rollup/plugin-json';
// import unpkgPlugin from '../plugins/unpkg-plugin.js';
import npmPlugin, { normalizeSpecifier } from '../plugins/npm-plugin/index.js';
import { resolvePackageVersion, loadPackageFile } from '../plugins/npm-plugin/registry.js';
import { getCachedBundle, setCachedBundle, sendCachedBundle, enqueueCompress } from './npm-middleware-cache.js';
import processGlobalPlugin from '../plugins/process-global-plugin.js';
import aliasesPlugin from '../plugins/aliases-plugin.js';
import { getMimeType } from './mimetypes.js';
import nodeBuiltinsPlugin from '../plugins/node-builtins-plugin.js';
import * as kl from 'kolorist';

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
 * @param {object} [options]
 * @param {'npm'|'unpkg'} [options.source = 'npm'] How to fetch package files
 * @param {Record<string,string>} [options.aliases]
 * @param {boolean} [options.optimize = true] Progressively minify and compress dependency bundles?
 * @param {string} [options.cwd] Virtual cwd
 * @returns {import('polka').Middleware}
 */
export default function npmMiddleware({ source = 'npm', aliases, optimize, cwd } = {}) {
	return async (req, res, next) => {
		// @ts-ignore
		const mod = req.path.replace(/^\//, '');

		const meta = normalizeSpecifier(mod);

		try {
			await resolvePackageVersion(meta);
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
			if (process.env.DEBUG) {
				console.log(`  ${kl.dim('middleware:') + kl.bold(kl.magenta('npm'))}  ${JSON.stringify(meta.specifier)}`);
			}
			// serve from memory and disk caches:
			const cached = await getCachedBundle(etag, meta, cwd);
			if (cached) return sendCachedBundle(req, res, cached);

			// const start = Date.now();
			const code = await bundleNpmModule(mod, { source, aliases });
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

/**
 * Bundle am npm module entry path into a single file
 * @param {string} mod The module to bundle, including subpackage/path
 * @param {object} options
 * @param {'npm'|'unpkg'} [options.source]
 * @param {Record<string,string>} [options.aliases]
 */
async function bundleNpmModule(mod, { source, aliases }) {
	let npmProviderPlugin;

	if (source === 'unpkg') {
		throw Error('unpkg plugin is disabled');
		// npmProviderPlugin = unpkgPlugin({
		// 	publicPath: '/@npm',
		// 	perPackage: true
		// });
	} else {
		npmProviderPlugin = npmPlugin({
			publicPath: '/@npm'
		});
	}

	const bundle = await rollup.rollup({
		input: mod,
		// input: '\0entry',
		cache: npmCache,
		shimMissingExports: true,
		treeshake: false,
		// inlineDynamicImports: true,
		// shimMissingExports: true,
		preserveEntrySignatures: 'allow-extension',
		plugins: [
			nodeBuiltinsPlugin({}),
			aliasesPlugin({ aliases }),
			npmProviderPlugin,
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
			{
				name: 'never-disk',
				load(s) {
					throw Error('local access not allowed');
				}
			}
		]
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
