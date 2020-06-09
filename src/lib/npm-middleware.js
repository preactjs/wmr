import * as rollup from 'rollup';
import commonjs from '@rollup/plugin-commonjs';
import json from '@rollup/plugin-json';
import unpkgPlugin from '../plugins/unpkg-plugin.js';
import npmPlugin, { normalizeSpecifier } from '../plugins/npm-plugin/index.js';
import { resolvePackageVersion } from '../plugins/npm-plugin/registry.js';
import { getCachedBundle, setCachedBundle, sendCachedBundle, enqueueCompress } from './npm-middleware-cache.js';

/**
 * @param {object} [options]
 * @param {'npm'|'unpkg'} [options.source = 'npm'] How to fetch package files
 * @returns {import('polka').Middleware}
 */
export default function npmMiddleware({ source = 'npm' } = {}) {
	return async (req, res, next) => {
		const mod = req.path.replace(/^\//, '');
		try {
			const meta = normalizeSpecifier(mod);
			await resolvePackageVersion(meta);

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

			const start = Date.now();
			const code = await bundleNpmModule(mod, { source });
			console.log(`Bundle dep: ${mod}: ${Date.now() - start}ms`);

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
 * @param {{ source: 'npm'|'unpkg' }} opts
 */
async function bundleNpmModule(mod, { source }) {
	const bundle = await rollup.rollup({
		input: mod,
		cache: npmCache,
		// treeshake: false,
		// inlineDynamicImports: true,
		// shimMissingExports: true,
		plugins: [
			source === 'npm'
				? npmPlugin({
						publicPath: '/@npm'
				  })
				: unpkgPlugin({
						publicPath: '/@npm',
						perPackage: true
				  }),
			commonjs({
				sourceMap: false,
				transformMixedEsModules: false
			}),
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
