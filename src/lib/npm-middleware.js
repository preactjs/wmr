import * as rollup from 'rollup';
import commonjs from '@rollup/plugin-commonjs';
import json from '@rollup/plugin-json';
// import unpkgPlugin from '../plugins/unpkg-plugin.js';
import npmPlugin, { normalizeSpecifier } from '../plugins/npm-plugin/index.js';
import { resolvePackageVersion, loadPackageFile } from '../plugins/npm-plugin/registry.js';
import { getCachedBundle, setCachedBundle, sendCachedBundle, enqueueCompress } from './npm-middleware-cache.js';
import processGlobalPlugin from '../plugins/process-global-plugin.js';
import aliasesPlugin from '../plugins/aliases-plugin.js';

/**
 * Serve a "proxy module" that uses the WMR runtime to load CSS.
 * @param {ReturnType<normalizeSpecifier>} meta
 * @param {import('http').ServerResponse} res
 */
async function handleCss(meta, res) {
	let code = '',
		type = '';
	if (meta.path.endsWith('.js')) {
		type = 'application/javascript';
		code = `
			import { style } from '/_wmr.js';
			style(${JSON.stringify('/@npm/' + meta.specifier.replace(/\.js$/, ''))});
		`;
	} else {
		type = 'text/css';
		code = await loadPackageFile(meta);
	}
	res.writeHead(200, {
		'content-type': type,
		'content-length': code.length
	});
	res.end(code);
}

/**
 * @param {object} [options]
 * @param {'npm'|'unpkg'} [options.source = 'npm'] How to fetch package files
 * @param {Record<string,string>} [options.aliases]
 * @returns {import('polka').Middleware}
 */
export default function npmMiddleware({ source = 'npm', aliases } = {}) {
	return async (req, res, next) => {
		const mod = req.path.replace(/^\//, '');

		try {
			const meta = normalizeSpecifier(mod);
			await resolvePackageVersion(meta);

			// CSS files and proxy modules don't use Rollup.
			if (meta.path.match(/\.css(\.js)?$/)) {
				return handleCss(meta, res);
			}

			// The package name + path + version is a strong ETag since versions are immutable
			const etag = Buffer.from(`${meta.specifier}${meta.version}`).toString('base64');
			if (req.headers['if-none-match'] === etag) {
				return res.writeHead(304).end();
			}
			res.setHeader('etag', etag);
			res.setHeader('content-type', 'application/javascript');

			// serve from memory and disk caches:
			const cached = await getCachedBundle(etag, meta);
			if (cached) return sendCachedBundle(req, res, cached);

			// const start = Date.now();
			const code = await bundleNpmModule(mod, { source, aliases });
			// console.log(`Bundle dep: ${mod}: ${Date.now() - start}ms`);

			// send it!
			res.writeHead(200, { 'content-length': code.length }).end(code);

			// store the bundle in memory and disk caches
			setCachedBundle(etag, code, meta);

			// this is a new bundle, we'll compress it with terser and brotli shortly
			enqueueCompress(etag);
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
			aliasesPlugin({ aliases }),
			npmProviderPlugin,
			commonjs({
				// TODO: extensions[]?
				sourceMap: false,
				transformMixedEsModules: true
			}),
			processGlobalPlugin(),
			json(),
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
