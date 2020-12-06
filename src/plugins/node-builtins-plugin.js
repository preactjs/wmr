import { builtinModules } from 'module';

/**
 * Return an error on Node built-ins in production.
 * Return a warning and stub Node built-ins otherwise.
 * @param {object} [options]
 * @returns {import('rollup').Plugin}
 */
export default function nodeBuiltinsPlugin({ production } = {}) {
	return {
		name: 'node-builtins',
		resolveId(id) {
			if (builtinModules.includes(id)) {
				return id;
			}
		},
		load(id) {
			if (builtinModules.includes(id)) {
				if (production) {
					this.error(`Error: ${id} is a Node built-in - WMR does not polyfill these`);
				}
				this.warn(`
				Warning: ${id} is a Node built-in - WMR does not polyfill these. 
				For development the module has been stubbed.
				`);
				return {
					code: 'export default {}',
					moduleSideEffects: false,
					syntheticNamedExports: true
				};
			}
			return null;
		}
	};
}
