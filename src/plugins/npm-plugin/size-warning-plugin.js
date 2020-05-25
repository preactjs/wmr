export default function sizeWarningPlugin({ threshold = 10000, factor = 3 } = {}) {
	return {
		name: 'size-warning-plugin',
		transform(contents, filename) {
			const approxSize = contents.length / factor;
			if (approxSize > threshold) {
				console.log(`Warning: large file ${filename} (${contents.length / 1000}kb)`);
			}
		}
	};
}
