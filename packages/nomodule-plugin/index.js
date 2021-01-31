import { transform } from '@swc/core';

/** @param {import('../../types').Options} options */
export default function (options) {
	if (options.mode && options.mode !== 'build') return;
	options.plugins.push(nomodulePlugin({}));
}

/**
 * @param {object} [options]
 * @returns {import('rollup').Plugin}
 */
function nomodulePlugin({} = {}) {
	return {
		name: '@wmr-plugins/nomodule',
		async generateBundle(opts, bundle) {
			const downleveled = new Map();
			for (const fileName in bundle) {
				const chunk = bundle[fileName];
				if (chunk.type !== 'chunk') continue;
				const legacy = await downlevel(chunk.code, fileName);
				if (!legacy) continue;
				const legacyFileName = chunk.fileName.replace(/\.js/, '.legacy.js');
				this.emitFile({
					type: 'asset',
					fileName: legacyFileName,
					source: legacy
				});
				downleveled.set(fileName, legacyFileName);
			}

			// Update all the HTML files with <script type=module> to add legacy loading via Shimport+Polyfills
			for (const fileName in bundle) {
				const asset = bundle[fileName];
				if (asset.type !== 'asset' || typeof asset.source !== 'string' || !asset.fileName.match(/\.html$/)) continue;
				if (!/<script(?:\s[^>]*)?\s+type=(['"])module\1/.test(asset.source)) continue;
				// this is gross obviously
				const POLYFILL = 'https://unpkg.com/@babel/polyfill@7.12.1/browser.js'; // https://unpkg.com/regenerator-runtime
				const SHIMPORT = 'https://unpkg.com/shimport@2.0.4/index.js';
				const script = `<script nomodule src="${POLYFILL}"></script><script nomodule src="${SHIMPORT}"></script><script nomodule>[].forEach.call(document.querySelectorAll('script[type=module]'),function(n){__shimport__.load(n.src.replace(/\\.js$/,'.legacy.js'))})</script>`;
				if (/<\/body>/.test(asset.source)) {
					asset.source = asset.source.replace(/<\/body>/, `${script}</body>`);
				} else {
					asset.source += script;
				}
			}
		}
	};
}

async function downlevel(code, fileName) {
	const result = await transform(code, {
		fileName,
		jsc: {
			parser: {
				dynamicImport: true,
			},
			target: 'es5'
		},
		minify: true,
	})
	return result.code;
}
