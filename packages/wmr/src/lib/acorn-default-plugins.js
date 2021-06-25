import acornClassFields from 'acorn-class-fields';
import acornPrivateMethods from 'acorn-private-methods';

/**
 * Use a plugin to inject acorn plugins in both development and
 * production mode.
 * @returns {import("rollup").Plugin}
 */
export function acornDefaultPlugins() {
	return {
		name: 'acorn-default-plugins',
		options(opts) {
			// @ts-ignore
			opts.acornInjectPlugins = [acornClassFields, acornPrivateMethods, ...(opts.acornInjectPlugins || [])];
			return opts;
		}
	};
}
