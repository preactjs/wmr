import * as rollup from 'rollup';
import commonjs from '@rollup/plugin-commonjs';
import json from '@rollup/plugin-json';
// import unpkgPlugin from '../plugins/unpkg-plugin.js';
import npmPlugin, { normalizeSpecifier } from '../plugins/npm-plugin/index.js';
import { resolvePackageVersion, loadPackageFile } from '../plugins/npm-plugin/registry.js';
import {
	getCachedBundle,
	setCachedBundle,
	sendCachedBundle,
	enqueueCompress,
	getEtag
} from './npm-middleware-cache.js';
import processGlobalPlugin from '../plugins/process-global-plugin.js';
import aliasPlugin from '../plugins/aliases-plugin.js';
import { getMimeType } from './mimetypes.js';
import nodeBuiltinsPlugin from '../plugins/node-builtins-plugin.js';
import * as kl from 'kolorist';
import { hasDebugFlag, onWarn } from './output-utils.js';
import path from 'path';
import { promises as fs } from 'fs';
import { defaultLoaders } from './default-loaders.js';
import { IMPLICIT_URL, urlPlugin } from '../plugins/url-plugin.js';
import { hasCustomPrefix } from './fs-utils.js';
import { transformImports } from './transform-imports.js';
import wmrStylesPlugin, { STYLE_REG } from '../plugins/wmr/styles/styles-plugin.js';
import { transform } from './acorn-traverse.js';

/**
 * Serve a "proxy module" that uses the WMR runtime to load CSS.
 * @param {ReturnType<typeof normalizeSpecifier>} meta
 * @param {import('http').ServerResponse} res
 * @param {boolean} [isModule]
 * @param {boolean} [isAsset]
 */
async function handleAsset(meta, res, isModule, isAsset) {
	let code = '';
	let type = null;

	console.log(meta, isModule);

	if (isModule) {
		type = 'application/javascript;charset=utf-8';
		const specifier = JSON.stringify('/@npm/' + meta.specifier + '?asset');
		code = `import{style}from '/_wmr.js';\nstyle(${specifier});`;
	} else if (isAsset) {
		//
		const etag = getEtag(meta);
		type = getMimeType(meta.path);
		const cached = await getCachedBundle(etag, meta);
		console.log('asset', etag, cached);
		if (cached) code = cached.code;
	} else {
		type = getMimeType(meta.path);
		code = await loadPackageFile(meta);
	}

	console.log('--> serve', code, type);
	res.writeHead(200, {
		'content-type': type || 'text/plain',
		'content-length': Buffer.byteLength(code)
	});
	res.end(code);
}

/**
 * @param {object} options
 * @param {'npm'|'unpkg'} [options.source = 'npm'] How to fetch package files
 * @param {Record<string,string>} [options.alias]
 * @param {boolean} [options.optimize = true] Progressively minify and compress dependency bundles?
 * @param {string} options.cwd Virtual cwd
 * @returns {import('polka').Middleware}
 */
export default function npmMiddleware({ source = 'npm', alias, optimize, cwd }) {
	return async (req, res, next) => {
		const url = new URL(req.url, 'https://localhost');
		// @ts-ignore
		const mod = url.pathname.replace(/^\//, '');

		const meta = normalizeSpecifier(mod);

		try {
			await resolvePackageVersion(meta);
		} catch (e) {
			return next(e);
		}

		try {
			// The package name + path + version is a strong ETag since versions are immutable
			const etag = getEtag(meta);
			const ifNoneMatch = String(req.headers['if-none-match']).replace(/-(gz|br)$/g, '');
			if (ifNoneMatch === etag) {
				return res.writeHead(304).end();
			}
			res.setHeader('etag', etag);

			// CSS files and proxy modules don't use Rollup.
			if (/\.((css|s[ac]ss|less)|wasm|txt|json)$/.test(meta.path)) {
				return handleAsset(meta, res, url.searchParams.has('module'), url.searchParams.has('asset'));
			}

			res.setHeader('content-type', 'application/javascript;charset=utf-8');
			if (hasDebugFlag()) {
				// eslint-disable-next-line no-console
				console.log(`  ${kl.dim('middleware:') + kl.bold(kl.magenta('npm'))}  ${JSON.stringify(meta.specifier)}`);
			}
			// serve from memory and disk caches:
			const cached = await getCachedBundle(etag, meta, cwd);
			if (cached) return sendCachedBundle(req, res, cached);

			const output = await bundleNpmModule(mod, { source, alias, cwd });

			const code = output[0].code;

			// Store bundled artifacts in memory and disk caches
			for (const chunk of output) {
				if (chunk.type === 'asset') {
					const assetMeta = { ...meta, path: chunk.fileName };
					const etag = getEtag(assetMeta);
					setCachedBundle(etag, chunk.source, assetMeta, cwd);
				} else if (chunk.isEntry) {
					setCachedBundle(etag, chunk.code, meta, cwd);
				} else {
					const chunkMeta = { ...meta, path: chunk.fileName };
					const etag = getEtag(chunkMeta);
					setCachedBundle(etag, chunk.code, chunkMeta, cwd);
				}
			}

			// send it!
			res.writeHead(200, { 'content-length': Buffer.byteLength(code) }).end(code);

			// this is a new bundle, we'll compress it with terser and brotli shortly
			if (optimize !== false) {
				// enqueueCompress(etag);
			}
		} catch (e) {
			console.error(`Error bundling ${mod}: `, e);
			next(e);
		}
	};
}

/**
 *
 * @param {Map<string, string | Buffer>} assets
 * @returns
 */
function npmAssetPlugin(assets) {
	return ({ types: t }) => {
		return {
			name: 'npm-asset-transform',
			visitor: {
				Program: {
					exit(path) {
						if (assets.size > 0) {
							path.unshiftContainer(
								'body',
								t.importDeclaration(
									[t.importSpecifier(t.identifier('style'), t.identifier('style'))],
									t.stringLiteral('wmr')
								)
							);
						}
					}
				},
				ImportDeclaration(path) {
					if (!t.isLiteral(path.node.source) || typeof path.node.source.value !== 'string') return;

					const spec = path.node.source.value;
					const fileId = assets.get(spec);
					if (!fileId) return;

					// path.replaceWith(
					// 	t.expressionStatement(
					// 		t.callExpression(t.identifier('style'), [
					// 			t.memberExpression(
					// 				t.metaProperty(t.identifier('import'), t.identifier('meta')),
					// 				t.identifier(`ROLLUP_FILE_URL_${fileId}`)
					// 			),
					// 			t.stringLiteral(spec)
					// 		])
					// 	)
					// );
					path.replaceWith(
						t.expressionStatement(
							t.callExpression(t.identifier('style'), [
								// t.stringLiteral(`/@npm/foo/foo-${fileId}.css?asset`),
								t.memberExpression(
									t.metaProperty(t.identifier('import'), t.identifier('meta')),
									t.identifier(`ROLLUP_FILE_URL_${fileId}`)
								),
								t.stringLiteral(spec)
							])
						)
					);
				}
			}
		};
	};
}

let npmCache;

/**
 * Bundle am npm module entry path into a single file
 * @param {string} mod The module to bundle, including subpackage/path
 * @param {object} options
 * @param {Record<string,string>} options.alias
 * @param {string} options.cwd
 */
async function bundleNpmModule(mod, { alias, cwd }) {
	const bundle = await rollup.rollup({
		input: mod,
		onwarn: onWarn,
		// input: '\0entry',
		cache: npmCache,
		shimMissingExports: true,
		treeshake: false,
		external: ['wmr'],

		// inlineDynamicImports: true,
		// shimMissingExports: true,
		preserveEntrySignatures: 'allow-extension',
		plugins: [
			{
				name: 'wmr-client-npm',
				generateBundle(_, bundle) {
					for (const chunk of Object.values(bundle)) {
						if (chunk.type === 'asset') continue;

						chunk.code = chunk.code.replace(/from\s['"]wmr['"]/, 'from "/_wmr.js"');
					}
				}
			},
			nodeBuiltinsPlugin({}),
			aliasPlugin({ alias }),
			npmPlugin({
				publicPath: '/@npm',
				cwd
			}),
			processGlobalPlugin({
				sourcemap: false,
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
				name: 'npm-asset',
				async resolveId(id, importer) {
					if (STYLE_REG.test(id)) {
						console.log('EXTERNAL', id);
						return id + '.js';
					}
				},
				async load(id) {
					console.log('==> LOAD', id);
					if (!STYLE_REG.test(id)) return;

					return `import { style } from "wmr";\nstyle("foo", "bar");
					`;
				},
				async transform(code, id) {
					if (!/\.([tj]sx?|mjs)$/.test(id)) return;

					return await transformImports(code, id, {
						resolveId(spec) {
							if (STYLE_REG.test(spec)) {
								return spec + '.js';
							}
						}
					});
					console.log(code);
					return;

					const assets = new Map();
					await transformImports(code, id, {
						resolveId(spec) {
							if (STYLE_REG.test(spec) || IMPLICIT_URL.test(spec)) {
								assets.set(spec, '');
							}
							return null;
						}
					});

					if (!assets.size) return;

					for (const spec of assets.keys()) {
						const resolved = await this.resolve(spec, id, { skipSelf: true });
						console.log(resolved, spec, id);
						if (resolved) {
							const file = path.join(cwd, resolved.id);
							if (file.startsWith(cwd)) {
								const source = STYLE_REG.test(file) ? await fs.readFile(file, 'utf-8') : await fs.readFile(file);

								// TODO: compile CSS module sources

								const fileId = this.emitFile({
									type: 'asset',
									name: path.basename(spec),
									source
								});
								console.log('ASS', fileId, spec);
								assets.set(spec, fileId);
							}
						}
					}

					const res = await transform(code, {
						parse: this.parse,
						plugins: [npmAssetPlugin(assets)]
					});

					console.log('NPM AssET', code, res, assets);

					return res;
				},
				async load(id) {
					if (!STYLE_REG.test(id)) return;
					const file = path.join(cwd, id);
					if (!file.startsWith(cwd)) return;

					const css = fs.readFile(file, 'utf-8');

					return css;
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
		// chunkFileNames: '[name]-[hash].js',
		// assetFileNames: `[name]-[hash][extname]`,
		// Don't transform paths at all:
		paths: String
	});

	console.log('OUT', output);

	return output;
}
