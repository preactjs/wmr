import MagicString from 'magic-string';
import * as rollup from 'rollup';
import path from 'path';
import { getPlugins } from '../lib/plugins.js';
import * as kl from 'kolorist';

/**
 * @param {import("wmr").Options} options
 * @returns {import('rollup').Plugin}
 */
export function workerPlugin(options) {
	const plugins = getPlugins({ ...options, isIIFEWorker: true });

	/** @type {Map<string, number>} */
	const moduleWorkers = new Map();
	let didWarnESM = false;

	return {
		name: 'worker',
		async transform(code, id) {
			// Transpile worker file if we're dealing with a worker
			if (/\.worker\.(?:[tj]sx?|mjs)$/.test(id)) {
				const resolved = await this.resolve(id);
				const resolvedId = resolved ? resolved.id : id;

				if (moduleWorkers.has(resolvedId)) {
					if (!didWarnESM) {
						const relativeId = path.relative(options.root, resolvedId);
						this.warn(
							kl.yellow(
								`Warning: Module workers are not widely supported yet. Use at your own risk. This warning occurs, because file `
							) +
								kl.cyan(relativeId) +
								kl.yellow(` was loaded as a Web Worker with type "module"`)
						);
						didWarnESM = true;
					}

					// ..but not in module mode
					return;
				}

				// TODO: Add support for HMR inside a worker.

				// Firefox doesn't support modules inside web workers. They're
				// the only main browser left to implement that feature. Until
				// that's resolved we need to pre-bundle the worker code as a
				// single script with no dependencies. Once they support that
				// we can drop the bundling part and have nested workers work
				// out of the box.
				// See: https://bugzilla.mozilla.org/show_bug.cgi?id=1247687
				const bundle = await rollup.rollup({
					input: id,
					plugins: [
						{
							name: 'worker-meta',
							resolveImportMeta(property) {
								// `import.meta.url` is only available in ESM environments
								if (property === 'url') {
									return 'location.href';
								}
							}
						},
						...plugins
					],
					// Inline all dependencies
					external: () => false
				});

				const res = await bundle.generate({
					format: 'iife',

					sourcemap: options.sourcemap,
					inlineDynamicImports: true
				});

				await bundle.close();

				return {
					code: res.output[0].code,
					map: res.output[0].map || null
				};
			}
			// Check if a worker is referenced anywhere in the file
			else if (/\.(?:[tj]sx?|mjs|cjs)$/.test(id)) {
				const WORKER_REG = /new URL\(\s*['"]([\w.-/:~]+)['"],\s*import\.meta\.url\s*\)(,\s*{.*?["']module["'].*?})?/gm;

				if (WORKER_REG.test(code)) {
					const s = new MagicString(code, {
						filename: id,
						// @ts-ignore
						indentExclusionRanges: undefined
					});

					let match;
					WORKER_REG.lastIndex = 0;
					while ((match = WORKER_REG.exec(code))) {
						const spec = match[1];

						// Worker URLs must be relative to properly work with chunks
						if (/^https?:/.test(spec) || !/^\.\.?\//.test(spec)) {
							throw new Error(`Worker import specifier must be relative. Got "${spec}" instead.`);
						}

						const ref = this.emitFile({
							type: 'chunk',
							id: spec
						});

						const resolved = await this.resolve(spec, id);
						const resolvedId = resolved ? resolved.id : spec;

						let usageCount = moduleWorkers.get(resolvedId) || 0;
						if (match[2]) {
							moduleWorkers.set(resolvedId, usageCount + 1);
						} else if (usageCount === 0) {
							moduleWorkers.delete(resolvedId);
						}

						const start = match.index + match[0].indexOf(spec);
						// Account for quoting characters and force URL to be
						// relative.
						s.overwrite(start - 1, start + spec.length + 1, `'.' + import.meta.ROLLUP_FILE_URL_${ref}`);
					}

					return {
						code: s.toString(),
						map: options.sourcemap
							? s.generateMap({ source: id, file: path.posix.basename(id), includeContent: true })
							: null
					};
				}
			}
		}
	};
}
