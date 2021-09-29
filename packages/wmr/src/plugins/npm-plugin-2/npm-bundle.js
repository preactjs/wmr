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

/**
 * @param {string} requestId
 * @param {object} options
 * @param {boolean} options.autoInstall
 * @param {boolean} options.production
 * @param {string} options.cacheDir
 * @param {string} options.cwd
 */
export async function npmBundle(requestId, { autoInstall, production, cacheDir, cwd }) {
	const meta = getPackageInfo(requestId);
	const pkgName = meta.name;

	/** @type {Map<string, string>} */
	const browserReplacement = new Map();

	const bundle = await rollup.rollup({
		input: requestId,
		external: [...builtinModules],
		plugins: [
			browserFieldPlugin({ browserReplacement }),
			npmExternalDeps({ requestId }),
			!process.env.DISABLE_LOCAL_NPM && npmLocalPackage({ root: cwd }),
			autoInstall && npmAutoInstall({ cacheDir }),
			npmLoad({ browserReplacement }),
			jsonPlugin({ root: cwd }),
			commonjsPlugin({ production }),
			subPackageLegacy({ rootId: requestId }),
			sizeWarningPlugin()
		]
	});

	const result = await bundle.generate({
		chunkFileNames: `${pkgName}-[hash]`,
		format: 'esm'
	});

	return result;
}
