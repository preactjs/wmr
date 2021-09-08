import acornClassFields from 'acorn-class-fields';
import acornPrivateMethods from 'acorn-private-methods';
import acornLogicalAssignment from 'acorn-logical-assignment';
import acornStaticClass from 'acorn-static-class-features';

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
			opts.acornInjectPlugins = [
				acornStaticClass,
				acornClassFields,
				acornPrivateMethods,
				acornLogicalAssignment,
				...(opts.acornInjectPlugins || [])
			];
			return opts;
		}
	};
}
