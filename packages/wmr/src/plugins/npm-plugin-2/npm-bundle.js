import * as rollup from 'rollup';
import { browserFieldPlugin } from './browser-field.js';
import { commonjsPlugin } from './commonjs.js';
import { subPackageLegacy } from './sub-package-legacy.js';
import { npmExternalDeps } from './npm-external-deps.js';
import { npmLocalPackage } from './npm-local-package.js';
import { npmLoad } from './npm-load.js';
import { getPackageInfo } from './utils.js';
import { npmAutoInstall } from './npm-auto-install.js';
import jsonPlugin from '../json-plugin.js';

/**
 * @param {string} cwd
 * @param {string} requestId
 * @param {object} options
 * @param {boolean} options.autoInstall
 * @param {boolean} options.production
 */
export async function npmBundle(cwd, requestId, { autoInstall, production }) {
	const meta = getPackageInfo(requestId);
	const pkgName = meta.name;

	/** @type {Map<string, string>} */
	const browserReplacement = new Map();

	const bundle = await rollup.rollup({
		input: 'virtual-entry',

		plugins: [
			{
				name: 'virtual-entry',
				resolveId(id) {
					if (id === 'virtual-entry') return id;
				},
				load(id) {
					if (id === 'virtual-entry') {
						return `const _foo = import('${requestId}');\nexport default _foo;\n`;
					}
				}
			},
			browserFieldPlugin({ browserReplacement }),
			npmExternalDeps({ requestId }),
			!process.env.DISABLE_LOCAL_NPM && npmLocalPackage({ root: cwd }),
			autoInstall && npmAutoInstall({ cwd }),
			npmLoad({ browserReplacement }),
			jsonPlugin({ root: cwd }),
			commonjsPlugin({ production }),
			subPackageLegacy({ rootId: requestId })
		]
	});

	const result = await bundle.generate({
		chunkFileNames: `${pkgName}-[hash]`,
		format: 'esm'
	});

	return result;
}
