// 100kb "approximate gzip" (avoids most warnings)
const DEFAULT_THRESHOLD = 100000;

/**
 * Warn when huge files are getting piped into node_modules.
 * @returns {import("rollup").Plugin}
 */
export default function sizeWarningPlugin({ threshold = DEFAULT_THRESHOLD, factor = 3 } = {}) {
	return {
		name: 'size-warning-plugin',
		transform(contents, filename) {
			const approxSize = contents.length / factor;
			if (approxSize > threshold) {
				// eslint-disable-next-line no-console
				console.log(`Warning: large file ${filename} (${Math.round(contents.length / 1000)}kb)`);
			}
		}
	};
}
