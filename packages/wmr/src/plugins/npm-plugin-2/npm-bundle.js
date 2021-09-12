import * as rollup from 'rollup';
import { browserFieldPlugin } from './browser-field.js';
import { commonjsPlugin } from './commonjs.js';
import { subPackageLegacy } from './sub-package-legacy.js';
import { npmExternalDeps } from './npm-external-deps.js';
import { npmLocalPackage } from './npm-local-package.js';
import { npmLoad } from './npm-load.js';
import { getPackageInfo } from './utils.js';
import { npmAutoInstall } from './npm-auto-install.js';

/**
 * @param {string} root
 * @param {string} id
 */
export async function npmBundle(root, id) {
	const meta = getPackageInfo(id);
	const pkgName = meta.name;

	/** @type {Map<string, string>} */
	const browserReplacement = new Map();

	const bundle = await rollup.rollup({
		input: id,

		plugins: [
			browserFieldPlugin({ browserReplacement }),
			npmExternalDeps({ pkgName }),
			npmLocalPackage({ root }),
			npmAutoInstall(),
			npmLoad({ browserReplacement }),
			commonjsPlugin(),
			subPackageLegacy({ rootId: id })
		]
	});

	const result = await bundle.generate({
		chunkFileNames: `${pkgName}-[hash]`,
		format: 'esm'
	});

	return result;
}
