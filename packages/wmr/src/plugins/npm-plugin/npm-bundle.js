import * as rollup from 'rollup';
import { builtinModules } from 'module';
import { browserFieldPlugin } from './browser-field.js';
import { commonjsPlugin } from './commonjs.js';
import { subPackageLegacy } from './sub-package-legacy.js';
import { npmExternalDeps } from './npm-external-deps.js';
import { npmLocalPackage } from './npm-local-package.js';
import { npmLoad } from './npm-load.js';
import { getPackageInfo } from './utils.js';
import { npmAutoInstall } from './npm-auto-install.js';
import jsonPlugin from '../json-plugin.js';
import sizeWarningPlugin from './size-warning-plugin.js';
import { onWarn } from '../../lib/output-utils.js';
import aliasPlugin from '../aliases-plugin.js';

/** @type {import('rollup').WarningHandlerWithDefault} */
function customWarn(warning) {
	// Ignore empty bundle warning which happens for CSS-only npm packages.
	if (typeof warning === 'object' && warning.code === 'EMPTY_BUNDLE') {
		return;
	}

	onWarn(warning);
}

/**
 * @param {object} options
 * @param {boolean} options.autoInstall
 * @param {boolean} options.production
 * @param {string} options.cacheDir
 * @param {string} options.cwd
 * @param {string} options.registryUrl
 * @param {string} [options.requestId]
 * @param {Map<string, string>} options.resolutionCache
 * @param {Map<string, string>} options.browserReplacement
 * @returns {import('rollup').Plugin[]}
 */
export function getNpmPlugins({
	autoInstall,
	production,
	cacheDir,
	cwd,
	resolutionCache,
	registryUrl,
	browserReplacement,
	requestId
}) {
	// @ts-ignore
	return [
		browserFieldPlugin({ browserReplacement }),
		!production && requestId && npmExternalDeps({ requestId }),
		!process.env.DISABLE_LOCAL_NPM && npmLocalPackage({ root: cwd }),
		autoInstall && npmAutoInstall({ cacheDir, registryUrl }),
		npmLoad({ browserReplacement, resolutionCache, production }),
		commonjsPlugin({ production }),
		subPackageLegacy(),
		sizeWarningPlugin()
	].filter(Boolean);
}

/**
 * @param {string} requestId
 * @param {object} options
 * @param {boolean} options.autoInstall
 * @param {boolean} options.production
 * @param {string} options.cacheDir
 * @param {string} options.cwd
 * @param {string} options.registryUrl
 * @param {Record<string, string>} options.alias
 * @param {Map<string, string>} options.resolutionCache
 */
export async function npmBundle(
	requestId,
	{ autoInstall, production, cacheDir, cwd, resolutionCache, registryUrl, alias }
) {
	const meta = getPackageInfo(requestId);
	const pkgName = meta.name;

	/** @type {Map<string, string>} */
	const browserReplacement = new Map();

	console.log('REQUEST', requestId);

	const bundle = await rollup.rollup({
		input: requestId,
		external: [...builtinModules],
		onwarn: customWarn,
		plugins: [
			aliasPlugin({ alias }),
			jsonPlugin({ root: cwd }),
			...getNpmPlugins({
				requestId,
				autoInstall,
				production,
				cacheDir,
				cwd,
				resolutionCache,
				registryUrl,
				browserReplacement
			})
		]
	});

	const result = await bundle.generate({
		chunkFileNames: `${pkgName}-[hash]`,
		format: 'esm'
	});

	return result;
}
