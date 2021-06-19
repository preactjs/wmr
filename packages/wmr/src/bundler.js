import { relative, sep, posix, resolve, dirname } from 'path';
import * as rollup from 'rollup';
import terser from './plugins/fast-minify.js';
import totalist from 'totalist';
import { getPlugins } from './lib/plugins.js';

/** @param {string} p */
const pathToPosix = p => p.split(sep).join(posix.sep);

/** @param {import('wmr').BuildOptions} options */
export async function bundleProd(options) {
	let { root, cwd, out, sourcemap, profile, minify, npmChunks = false, output } = options;

	// note: we intentionally pass these to Rollup as posix paths
	const ignore = /^\.\/(node_modules|dist|build)\//;
	/** @type {string[]} */ const input = [];

	await totalist(root, (rel, abs) => {
		if (ignore.test(abs)) return;
		if (!/\.html?/.test(rel)) return;
		input.push('./' + pathToPosix(relative(cwd, abs)));
	});

	const bundle = await rollup.rollup({
		input,
		perf: !!profile,
		preserveEntrySignatures: 'allow-extension',
		manualChunks: npmChunks ? extractNpmChunks : undefined,
		plugins: getPlugins(options)
	});

	/** @type {import('rollup').OutputOptions} */
	const outputConfig = {
		entryFileNames: '[name].[hash].js',
		chunkFileNames: 'chunks/[name].[hash].js',
		assetFileNames: 'assets/[name].[hash][extname]',
		compact: true,
		// Rollup considers `import '//foo.com/bar'` to be a filesystem path, we do not.
		paths(fileName) {
			if (/^\/\//.test(fileName)) {
				fileName = 'https:' + fileName;
			}
			return fileName;
		},
		hoistTransitiveImports: true,
		plugins: [minify && terser({ compress: true, sourcemap })],
		sourcemap,
		sourcemapPathTransform(p, mapPath) {
			let url = pathToPosix(relative(root, resolve(dirname(mapPath), p)));
			// strip leading relative path
			url = url.replace(/^\.\//g, '');
			// replace internal npm prefix
			url = url.replace(/^(\.?\.?\/)?npm\//, '@npm/');
			return 'source:///' + url;
		},
		preferConst: true,
		dir: out || 'dist'
	};

	const result = await bundle.write(outputConfig);

	if (output) {
		if (!Array.isArray(output)) output = [output];
		if (output.length) {
			await Promise.all(
				output.map(output => {
					if (typeof output === 'function') {
						output = output({ ...outputConfig });
					}
					return bundle.write(output);
				})
			);
		}
	}

	await bundle.close();

	return result;
}

/** @type {import('rollup').GetManualChunk} */
function extractNpmChunks(id, { getModuleIds, getModuleInfo }) {
	const chunk = getModuleInfo(id);
	if (/^npm\//.test(chunk.id)) {
		// merge any modules that are only used by other modules:
		const isInternalModule = chunk.importers.every(c => /^npm\//.test(c));
		if (isInternalModule) return null;

		// create dedicated chunks for npm dependencies that are used in more than one place:
		const importerCount = chunk.importers.length + chunk.dynamicImporters.length;
		if (importerCount > 1) {
			let name = chunk.id;
			// strip any unnecessary (non-unique) trailing path segments:
			const moduleIds = Array.from(getModuleIds()).filter(m => m !== name);
			while (name.length > 1) {
				const dir = posix.dirname(name);
				const match = moduleIds.find(m => m.startsWith(dir));
				if (match) break;
				name = dir;
			}
			// /chunks/@npm/NAME.[hash].js
			return name.replace(/^npm\/((?:@[^/]+\/)?[^/]+)@[^/]+/, '@npm/$1');
		}
	}
	return null;
}
